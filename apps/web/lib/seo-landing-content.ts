import type { TaxonomyLanding } from '@/components/seo/taxonomy-landing-page';

const categoryIntros: Record<string, string> = {
  coding:
    'Find reusable prompts for debugging, code reviews, architecture, and shipping clearer software with your AI coding assistant.',
  marketing:
    'Turn campaign ideas into practical briefs, copy, positioning, and experiments with prompts built for marketers.',
  seo: 'Plan content, audits, keyword research, and on-page improvements with prompts designed for focused SEO work.',
  business:
    'Use structured AI prompts for strategy, operations, customer research, and everyday business decisions.',
  writing:
    'Move from blank page to polished draft with prompts for ideation, editing, tone, and long-form writing.',
  research:
    'Work through research questions, source synthesis, summaries, and literature review tasks with reusable prompts.',
  productivity:
    'Reduce repetitive work with prompts for planning, prioritization, meeting notes, and personal workflows.',
};

export function categoryLanding(name: string, slug: string): TaxonomyLanding {
  const label = name.trim();
  const subject = label.toLowerCase();
  const intro =
    categoryIntros[slug] ??
    `Discover practical ${subject} prompts for planning, creating, and getting better results from AI.`;
  return {
    kind: 'category',
    slug,
    name: label,
    title: `${label} Prompts: Reusable AI Prompts That Work`,
    description: `Explore curated ${subject} prompts with editable variables, clear context, and real community usage. Copy a starting point, customize it, and make it yours.`,
    intro,
    faqs: [
      {
        question: `What are the best ${subject} prompts?`,
        answer: `The best prompts give an AI tool a clear role, context, constraints, and a useful output format. Browse the highest-signal prompts on this page and adapt the variables to your task.`,
      },
      {
        question: `Can I customize these ${subject} prompts?`,
        answer:
          'Yes. Open a prompt to preview it, edit its highlighted variables, and copy the version that fits your goal.',
      },
      {
        question: `Which AI models work with these prompts?`,
        answer:
          'Each prompt can list its compatible AI model or tool. Most well-structured prompts can also be adapted across models.',
      },
    ],
    related: [
      { name: 'Explore all prompts', href: '/explore' },
      { name: 'Search the library', href: '/search' },
    ],
  };
}

export function audienceLanding(
  name: string,
  slug: string,
  sourceDescription?: string | null,
): TaxonomyLanding {
  const label = name.trim();
  const title =
    slug === 'students'
      ? 'Best ChatGPT Prompts for Students'
      : `AI Prompts for ${label}`;
  return {
    kind: 'audience',
    slug,
    name: label,
    title,
    description:
      sourceDescription?.trim() ||
      `Discover useful AI prompts selected for ${label.toLowerCase()}: writing, research, planning, and everyday work made easier.`,
    intro: `Start with prompts made for ${label.toLowerCase()}. Preview the full prompt, fill in its variables, and copy a personalized version in seconds.`,
    faqs: [
      {
        question: `How can ${label.toLowerCase()} use AI prompts?`,
        answer: `Choose a prompt that matches the outcome you need, add your own context, and review the result before using it in your work.`,
      },
      {
        question: `Are these prompts free to use?`,
        answer:
          'Public Vrompt prompts are available to read and copy. Check each prompt’s license and attribution details before publishing or redistributing results.',
      },
      {
        question: `Can I save a useful prompt?`,
        answer:
          'Signed-in users can save prompts to their library, rate them with a like, and return to them later.',
      },
    ],
    related: [
      { name: 'Browse prompt categories', href: '/explore' },
      { name: 'Search by goal', href: '/search' },
    ],
  };
}
