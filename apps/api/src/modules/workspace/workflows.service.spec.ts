import { WorkflowsService } from './workflows.service';

describe('WorkflowsService', () => {
  const workflow = {
    id: '11111111-1111-4111-8111-111111111111',
    projectId: '22222222-2222-4222-8222-222222222222',
    name: 'Document workflow',
    enabled: true,
    steps: [
      { name: 'Summarize', prompt: 'Summarize', modelId: null },
      {
        name: 'Tasks',
        prompt: 'Extract tasks',
        modelId: '33333333-3333-4333-8333-333333333333',
      },
    ],
  };
  const input = {
    requestId: '44444444-4444-4444-8444-444444444444',
    input: 'Source document',
  };

  function setup(existing: unknown = null) {
    const run = {
      id: input.requestId,
      workflowId: workflow.id,
      conversationId: '55555555-5555-4555-8555-555555555555',
      fingerprint: expect.any(String),
      steps: workflow.steps,
      status: 'RESERVED',
      completedSteps: 0,
      error: null,
      createdAt: new Date(),
      startedAt: new Date(),
      finishedAt: null,
    };
    const prisma: any = {
      workflow: { findFirst: jest.fn().mockResolvedValue(workflow) },
      workflowRun: {
        findUnique: jest.fn().mockResolvedValue(existing),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue(run),
        update: jest
          .fn()
          .mockResolvedValueOnce({ ...run, completedSteps: 1 })
          .mockResolvedValueOnce({ ...run, completedSteps: 2 })
          .mockResolvedValue({
            ...run,
            status: 'SUCCEEDED',
            completedSteps: 2,
          }),
      },
      conversation: {
        create: jest.fn().mockResolvedValue({ id: run.conversationId }),
      },
      $queryRaw: jest.fn(),
    };
    prisma.$transaction = (callback: (tx: unknown) => unknown) =>
      callback(prisma);
    const projects = {
      owned: jest.fn().mockResolvedValue({ id: workflow.projectId }),
    };
    const quota = {
      policies: jest.fn().mockResolvedValue({
        plan: { maxWorkflows: 10, maxWorkflowSteps: 5 },
      }),
    };
    const chat = {
      generate: jest.fn(async (...args: any[]) => {
        const emit = args[4] as (event: unknown) => void;
        emit({
          type: 'delta',
          text: `output-${chat.generate.mock.calls.length}`,
        });
        emit({ type: 'done', status: 'SUCCEEDED' });
      }),
    };
    return {
      service: new WorkflowsService(
        prisma,
        projects as any,
        quota as any,
        chat as any,
      ),
      prisma,
      chat,
      run,
    };
  }

  it('returns a prior idempotent run without executing providers again', async () => {
    const prior = {
      id: input.requestId,
      workflowId: workflow.id,
      fingerprint: '',
      status: 'SUCCEEDED',
    };
    const context = setup(prior);
    // Match the fingerprint generated for this exact workflow input.
    const crypto = await import('node:crypto');
    prior.fingerprint = crypto
      .createHash('sha256')
      .update(JSON.stringify({ id: workflow.id, input: input.input }))
      .digest('hex');

    await expect(
      context.service.run(
        'user',
        workflow.id,
        input,
        new AbortController().signal,
      ),
    ).resolves.toBe(prior);
    expect(context.chat.generate).not.toHaveBeenCalled();
    expect(context.prisma.conversation.create).not.toHaveBeenCalled();
  });

  it('claims a new run once and feeds each completed output to the next step', async () => {
    const context = setup();
    await context.service.run(
      'user',
      workflow.id,
      input,
      new AbortController().signal,
    );

    expect(context.prisma.workflowRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ startedAt: expect.any(Date) }),
      }),
    );
    expect(context.chat.generate).toHaveBeenCalledTimes(2);
    expect(context.chat.generate.mock.calls[0]![2]).toEqual(
      expect.objectContaining({ mode: 'AUTO' }),
    );
    expect(context.chat.generate.mock.calls[1]![2]).toEqual(
      expect.objectContaining({
        mode: 'MANUAL',
        modelId: workflow.steps[1]!.modelId,
        content: expect.stringContaining('output-1'),
      }),
    );
  });
});
