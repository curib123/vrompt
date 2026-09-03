import { PrismaService } from '../prisma/prisma.service';
import { AiQualityService } from './ai-quality.service';

describe('AiQualityService', () => {
  it('normalizes valid structured output and bounds metadata', () => {
    const service = new AiQualityService({} as PrismaService);
    const result = service.validateDraft({
      title: 'Launch plan risk reviewer',
      description:
        'Review a launch plan for assumptions, risks, and next steps.',
      content:
        'Role: Act as a launch reviewer.\n\nObjective: Review the supplied plan.\n\nTask: Identify risks and output a prioritized action plan.',
      variables: [
        {
          name: 'plan',
          description: 'The plan to review',
          defaultValue: 'Draft plan',
        },
      ],
      tags: ['launch', 'risk'],
      categorySlug: 'business',
      audienceSlug: 'business-users',
    });

    expect(result).toMatchObject({
      title: 'Launch plan risk reviewer',
      categorySlug: 'business',
      variables: [{ name: 'plan', required: false }],
    });
  });

  it('rejects generic or unstructured output', () => {
    const service = new AiQualityService({} as PrismaService);
    expect(() =>
      service.validateDraft({
        title: 'Write a prompt',
        description: 'This is a sufficiently long description for a test.',
        content:
          'Just answer the user clearly and helpfully with no additional structure. '.repeat(
            2,
          ),
      }),
    ).toThrow('Generated title is too generic');
  });
});
