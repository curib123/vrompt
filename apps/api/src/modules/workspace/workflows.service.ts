import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import Joi from 'joi';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';
import { QuotaService } from './quota.service';
import { ChatService } from './chat.service';
import { validate } from './registry.service';

type Step = { name: string; prompt: string; modelId: string | null };
const schema = Joi.object({
  projectId: Joi.string().uuid().required(),
  name: Joi.string().trim().max(160).required(),
  enabled: Joi.boolean().default(true),
  steps: Joi.array()
    .min(1)
    .max(20)
    .items(
      Joi.object({
        name: Joi.string().max(160).required(),
        prompt: Joi.string().max(8000).required(),
        modelId: Joi.string().uuid().allow(null).default(null),
      }),
    )
    .required(),
});
@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly quota: QuotaService,
    private readonly chat: ChatService,
  ) {}
  list(userId: string) {
    return this.prisma.workflow.findMany({
      where: { project: { userId } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }
  async owned(userId: string, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, project: { userId } },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }
  async save(userId: string, input: unknown, id?: string) {
    const data = validate<{
      projectId: string;
      name: string;
      enabled: boolean;
      steps: Step[];
    }>(schema, input);
    await this.projects.owned(userId, data.projectId, true);
    if (id) await this.owned(userId, id);
    const { plan, policies } = await this.quota.policies(userId);
    if (!plan?.maxWorkflows || data.steps.length > plan.maxWorkflowSteps)
      throw new ForbiddenException('Workflow exceeds your plan allowance.');
    if (
      data.steps.some(
        (s) => s.modelId && !policies.some((p) => p.modelId === s.modelId),
      )
    )
      throw new ForbiddenException(
        'A step model is not included in your plan.',
      );
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
      if (
        !id &&
        (await tx.workflow.count({ where: { project: { userId } } })) >=
          plan.maxWorkflows
      )
        throw new ForbiddenException('Workflow allowance reached.');
      return id
        ? tx.workflow.update({ where: { id }, data })
        : tx.workflow.create({ data });
    });
  }
  async remove(userId: string, id: string) {
    await this.owned(userId, id);
    if (
      await this.prisma.workflowRun.count({
        where: { workflowId: id, status: 'RESERVED' },
      })
    )
      throw new ConflictException('Workflow is running.');
    await this.prisma.workflow.delete({ where: { id } });
    return { deleted: true };
  }
  async history(userId: string, id: string) {
    await this.owned(userId, id);
    return this.prisma.workflowRun.findMany({
      where: { workflowId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  async run(userId: string, id: string, input: unknown, signal: AbortSignal) {
    const data = validate<{ requestId: string; input: string }>(
      Joi.object({
        requestId: Joi.string().uuid().required(),
        input: Joi.string().max(32000).required(),
      }),
      input,
    );
    const workflow = await this.owned(userId, id);
    await this.projects.owned(userId, workflow.projectId, true);
    const { plan } = await this.quota.policies(userId);
    const steps = workflow.steps as unknown as Step[];
    if (
      !workflow.enabled ||
      !plan?.maxWorkflows ||
      steps.length > plan.maxWorkflowSteps
    )
      throw new ForbiddenException(
        'Workflow is disabled or exceeds your plan.',
      );
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ id, input: data.input }))
      .digest('hex');
    const claim = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
      const existing = await tx.workflowRun.findUnique({
        where: { id: data.requestId },
      });
      if (existing) {
        if (existing.workflowId !== id || existing.fingerprint !== fingerprint)
          throw new ConflictException('Request ID already used.');
        return { run: existing, execute: false };
      }
      // No run can exceed 20 steps of the hard 600-second generation ceiling.
      await tx.workflowRun.updateMany({
        where: {
          workflow: { project: { userId } },
          status: 'RESERVED',
          createdAt: { lt: new Date(Date.now() - 12_600_000) },
        },
        data: {
          status: 'INTERRUPTED',
          finishedAt: new Date(),
          error:
            'Execution interrupted. Review completed steps before retrying.',
        },
      });
      if (
        await tx.workflowRun.count({
          where: { workflow: { project: { userId } }, status: 'RESERVED' },
        })
      )
        throw new ConflictException('Another workflow is running.');
      const recent = await tx.workflowRun.count({
        where: {
          workflow: { project: { userId } },
          createdAt: { gte: new Date(Date.now() - 60_000) },
        },
      });
      if (recent >= 3)
        throw new BadRequestException(
          'Please wait before starting another workflow.',
        );
      const conversation = await tx.conversation.create({
        data: { userId, projectId: workflow.projectId, title: workflow.name },
      });
      const created = await tx.workflowRun.create({
        data: {
          id: data.requestId,
          workflowId: id,
          conversationId: conversation.id,
          fingerprint,
          steps: workflow.steps as Prisma.InputJsonValue,
          startedAt: new Date(),
        },
      });
      return { run: created, execute: true };
    });
    // Only the transaction that creates the run may call providers.
    // Repeated request IDs return the existing run without executing again.
    if (!claim.execute) return claim.run;
    const run = claim.run;
    let previous = data.input;
    try {
      for (const step of steps) {
        if (signal.aborted) throw new Error('Execution stopped.');
        let completed = false;
        let output = '';
        await this.chat.generate(
          userId,
          run.conversationId,
          {
            requestId: randomUUID(),
            content: `${step.prompt}\n\nInput:\n${previous}`,
            mode: step.modelId ? 'MANUAL' : 'AUTO',
            ...(step.modelId ? { modelId: step.modelId } : {}),
            attachmentIds: [],
          },
          signal,
          (event) => {
            const value = event as {
              type: string;
              text?: string;
              status?: string;
            };
            if (value.type === 'delta') output += value.text ?? '';
            if (value.type === 'done') completed = value.status === 'SUCCEEDED';
          },
        );
        if (!completed)
          throw new Error(
            'Step did not complete. Review the conversation before retrying.',
          );
        previous = output;
        await this.prisma.workflowRun.update({
          where: { id: run.id },
          data: { completedSteps: { increment: 1 } },
        });
      }
      return await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: 'SUCCEEDED', error: null, finishedAt: new Date() },
      });
    } catch (error) {
      return this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: signal.aborted ? 'CANCELLED' : 'FAILED',
          error: (error instanceof Error
            ? error.message
            : 'Execution failed.'
          ).slice(0, 500),
          finishedAt: new Date(),
        },
      });
    }
  }
}
