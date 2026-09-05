import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import Joi from 'joi';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from './quota.service';
import { validate } from './registry.service';

const projectSchema = Joi.object({
  name: Joi.string().trim().max(160).required(),
  instructions: Joi.string().allow('').max(8000).default(''),
  context: Joi.string().allow('').max(200000).default(''),
  preferredModelId: Joi.string().uuid().allow(null).default(null),
  archived: Joi.boolean().default(false),
});

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quota: QuotaService,
  ) {}

  async owned(userId: string, id: string, writable = false) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (writable) {
      const { plan } = await this.quota.policies(userId);
      if (!plan || plan.maxProjects < 1)
        throw new ForbiddenException('Upgrade to use Projects.');
      if (project.archived)
        throw new BadRequestException('Restore this Project before using it.');
    }
    return project;
  }

  list(userId: string, q = '') {
    return this.prisma.project.findMany({
      where: {
        userId,
        name: { contains: q.slice(0, 160), mode: 'insensitive' },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async save(userId: string, input: unknown, id?: string) {
    const data = validate<
      Pick<
        Prisma.ProjectUncheckedCreateInput,
        'name' | 'instructions' | 'context' | 'preferredModelId' | 'archived'
      >
    >(projectSchema, input);
    const { plan, policies } = await this.quota.policies(userId);
    if (!plan || plan.maxProjects < 1)
      throw new ForbiddenException('Upgrade to use Projects.');
    if (id) await this.owned(userId, id);
    if (
      data.preferredModelId &&
      !policies.some((p) => p.modelId === data.preferredModelId)
    )
      throw new ForbiddenException(
        'Preferred model is not included in your plan.',
      );
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
      if (
        !id &&
        (await tx.project.count({ where: { userId } })) >= plan.maxProjects
      )
        throw new ForbiddenException('Project allowance reached.');
      return id
        ? tx.project.update({ where: { id }, data })
        : tx.project.create({ data: { ...data, userId } });
    });
  }

  async detail(userId: string, id: string) {
    const project = await this.owned(userId, id);
    return {
      ...project,
      conversations: await this.prisma.conversation.findMany({
        where: { userId, projectId: id },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      prompts: await this.prisma.savedPrompt.findMany({
        where: { userId, projectId: id },
        take: 200,
      }),
      files: await this.prisma.attachment.findMany({
        where: { userId, conversation: { projectId: id }, generated: false },
        select: {
          id: true,
          name: true,
          size: true,
          mimeType: true,
          conversationId: true,
        },
        take: 200,
      }),
    };
  }

  async remove(userId: string, id: string) {
    await this.owned(userId, id);
    if (
      await this.prisma.workflowRun.count({
        where: { workflow: { projectId: id }, status: 'RESERVED' },
      })
    )
      throw new BadRequestException('A workflow is still running.');
    // Chats, their files and Saved Prompts remain in the personal workspace.
    await this.prisma.project.delete({ where: { id } });
    return { deleted: true };
  }
}
