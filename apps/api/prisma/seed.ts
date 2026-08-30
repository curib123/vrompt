import {
  AccountType,
  CollectionVisibility,
  PrismaClient,
  PromptRepositoryStatus,
  PromptVersionStatus,
  PromptVisibility,
  UserRole,
  UserStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const officialCategories = [
  'Coding',
  'Design',
  'Writing',
  'Business',
  'Marketing',
  'Education',
  'Research',
  'Productivity',
  'Data Analysis',
  'Image Generation',
  'Career',
  'Entertainment',
  'Other',
] as const;

const seedUsers = [
  {
    email: 'official@vrompt.local',
    username: 'vrompt-official',
    displayName: 'Vrompt Official',
    accountType: AccountType.OFFICIAL,
    bio: 'Official Vrompt starter guidance and examples.',
  },
  {
    email: 'starter@vrompt.local',
    username: 'vrompt-starter',
    displayName: 'Vrompt Starter',
    accountType: AccountType.STARTER,
    bio: 'Clearly labeled starter repositories for exploring Vrompt.',
  },
  {
    email: 'prompt-lab@vrompt.local',
    username: 'prompt-lab-starter',
    displayName: 'Prompt Lab Starter',
    accountType: AccountType.STARTER,
    bio: 'Starter examples from the Vrompt prompt lab.',
  },
] as const;

type SeedRepository = {
  slug: string;
  owner: string;
  title: string;
  description: string;
  category: string;
  tags: readonly string[];
  content: string;
  examples: readonly {
    title: string;
    input: string;
    output: string;
  }[];
  source?: string;
};

const seedRepositories: readonly SeedRepository[] = [
  {
    slug: 'vrompt-official-prompt-review-checklist',
    owner: 'vrompt-official',
    title: 'Prompt Review Checklist',
    description:
      'A practical checklist for improving a prompt before sharing it.',
    category: 'Writing',
    tags: ['prompt engineering', 'quality'],
    content:
      'Review this prompt for clarity, constraints, expected output, and missing context. Return prioritized improvements with a short rationale for each.',
    examples: [
      {
        title: 'Checklist request',
        input: 'Review my customer support prompt.',
        output:
          'I will check intent, audience, constraints, output format, and edge cases.',
      },
    ],
  },
  {
    slug: 'vrompt-starter-meeting-notes',
    owner: 'vrompt-starter',
    title: 'Meeting Notes to Decisions',
    description:
      'Turn rough meeting notes into decisions, owners, and next steps.',
    category: 'Productivity',
    tags: ['meetings', 'summaries'],
    content:
      'Transform the meeting notes below into a concise decision log. Separate decisions, open questions, action items, owners, and due dates. Do not invent missing details.',
    examples: [],
  },
  {
    slug: 'vrompt-starter-research-synthesis',
    owner: 'vrompt-starter',
    title: 'Research Synthesis Brief',
    description:
      'Create a source-aware brief from research notes without overstating evidence.',
    category: 'Research',
    tags: ['research', 'synthesis'],
    content:
      'Synthesize the supplied research notes into a brief with findings, supporting sources, uncertainty, and follow-up questions. Clearly distinguish evidence from interpretation.',
    examples: [],
  },
  {
    slug: 'vrompt-starter-product-brief',
    owner: 'prompt-lab-starter',
    title: 'Product Brief from a Raw Idea',
    description:
      'Shape a raw product idea into a focused brief with assumptions called out.',
    category: 'Business',
    tags: ['product', 'planning'],
    content:
      'Turn the idea below into a product brief covering user, problem, proposed workflow, success signal, risks, and the smallest useful first release.',
    examples: [],
  },
  {
    slug: 'vrompt-starter-product-brief-concise',
    owner: 'prompt-lab-starter',
    title: 'Product Brief, Concise Variant',
    description:
      'A concise variant of the starter product brief for quick planning sessions.',
    category: 'Business',
    tags: ['product', 'planning'],
    content:
      'Summarize this product idea in five sections: user, problem, workflow, success signal, and next step. Mark assumptions explicitly.',
    examples: [],
    source: 'vrompt-starter-product-brief',
  },
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function seedCategories() {
  for (const name of officialCategories) {
    await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: { name },
      create: { name, slug: slugify(name) },
    });
  }
}

async function seedAccounts() {
  const accounts = new Map<string, { id: string }>();

  for (const seedUser of seedUsers) {
    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        username: seedUser.username,
        accountType: seedUser.accountType,
        status: UserStatus.ACTIVE,
      },
      create: {
        email: seedUser.email,
        username: seedUser.username,
        googleId: `seed:${seedUser.username}`,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        accountType: seedUser.accountType,
      },
      select: { id: true },
    });

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: { displayName: seedUser.displayName, bio: seedUser.bio },
      create: {
        userId: user.id,
        displayName: seedUser.displayName,
        bio: seedUser.bio,
      },
    });
    accounts.set(seedUser.username, user);
  }

  return accounts;
}

async function seedRepository(
  repositoryInput: (typeof seedRepositories)[number],
  accounts: Map<string, { id: string }>,
  repositories: Map<string, { id: string; rootPromptId: string | null }>,
) {
  const owner = accounts.get(repositoryInput.owner);
  if (!owner)
    throw new Error(`Seed account not found: ${repositoryInput.owner}`);

  const category = await prisma.category.findUnique({
    where: { slug: slugify(repositoryInput.category) },
    select: { id: true },
  });
  if (!category)
    throw new Error(`Seed category not found: ${repositoryInput.category}`);

  const source = repositoryInput.source
    ? repositories.get(repositoryInput.source)
    : undefined;
  const repository = await prisma.promptRepository.upsert({
    where: { slug: repositoryInput.slug },
    update: {
      ownerId: owner.id,
      categoryId: category.id,
      title: repositoryInput.title,
      description: repositoryInput.description,
      visibility: PromptVisibility.PUBLIC,
      status: PromptRepositoryStatus.ACTIVE,
      sourcePromptId: source?.id,
      rootPromptId: source?.rootPromptId ?? source?.id,
    },
    create: {
      ownerId: owner.id,
      categoryId: category.id,
      title: repositoryInput.title,
      slug: repositoryInput.slug,
      description: repositoryInput.description,
      visibility: PromptVisibility.PUBLIC,
      status: PromptRepositoryStatus.ACTIVE,
      sourcePromptId: source?.id,
      rootPromptId: source?.rootPromptId ?? source?.id,
    },
    select: { id: true, rootPromptId: true },
  });

  const version = await prisma.promptVersion.upsert({
    where: {
      repositoryId_versionNumber: {
        repositoryId: repository.id,
        versionNumber: 1,
      },
    },
    update: {
      authorId: owner.id,
      content: repositoryInput.content,
      status: PromptVersionStatus.PUBLISHED,
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    create: {
      repositoryId: repository.id,
      authorId: owner.id,
      versionNumber: 1,
      content: repositoryInput.content,
      status: PromptVersionStatus.PUBLISHED,
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    select: { id: true },
  });

  await prisma.promptVariable.deleteMany({
    where: { promptVersionId: version.id },
  });
  await prisma.promptExample.deleteMany({
    where: { promptVersionId: version.id },
  });
  if (repositoryInput.examples.length > 0) {
    await prisma.promptExample.createMany({
      data: repositoryInput.examples.map((example, index) => ({
        promptVersionId: version.id,
        title: example.title,
        input: example.input,
        output: example.output,
        sortOrder: index,
      })),
    });
  }

  await prisma.promptRepository.update({
    where: { id: repository.id },
    data: { currentVersionId: version.id },
  });
  await prisma.promptTag.deleteMany({
    where: { promptRepositoryId: repository.id },
  });
  for (const tagName of repositoryInput.tags) {
    const normalizedName = tagName.toLowerCase();
    const tag = await prisma.tag.upsert({
      where: { normalizedName },
      update: {
        name: normalizedName,
        slug: slugify(normalizedName),
        isOfficial: true,
      },
      create: {
        name: normalizedName,
        normalizedName,
        slug: slugify(normalizedName),
        isOfficial: true,
      },
      select: { id: true },
    });
    await prisma.promptTag.create({
      data: { promptRepositoryId: repository.id, tagId: tag.id },
    });
  }

  repositories.set(repositoryInput.slug, {
    id: repository.id,
    rootPromptId: repository.rootPromptId,
  });
}

async function seedCollection(
  ownerId: string,
  name: string,
  description: string,
  repositorySlugs: string[],
  repositories: Map<string, { id: string }>,
) {
  const slug = slugify(name);
  const collection = await prisma.collection.upsert({
    where: { ownerId_slug: { ownerId, slug } },
    update: {
      name,
      description,
      visibility: CollectionVisibility.PUBLIC,
      archivedAt: null,
    },
    create: {
      ownerId,
      name,
      slug,
      description,
      visibility: CollectionVisibility.PUBLIC,
    },
    select: { id: true },
  });

  await prisma.collectionPrompt.deleteMany({
    where: { collectionId: collection.id },
  });
  await prisma.collectionPrompt.createMany({
    data: repositorySlugs.map((repositorySlug, sortOrder) => {
      const repository = repositories.get(repositorySlug);
      if (!repository)
        throw new Error(`Seed repository not found: ${repositorySlug}`);
      return {
        collectionId: collection.id,
        promptRepositoryId: repository.id,
        sortOrder,
      };
    }),
  });
}

async function main() {
  await prisma.$queryRaw`SELECT 1`;
  await seedCategories();
  const accounts = await seedAccounts();
  const repositories = new Map<
    string,
    { id: string; rootPromptId: string | null }
  >();

  for (const repository of seedRepositories) {
    await seedRepository(repository, accounts, repositories);
  }

  for (const repositoryInput of seedRepositories) {
    if (!repositoryInput.source) continue;
    const source = repositories.get(repositoryInput.source);
    if (!source)
      throw new Error(
        `Seed source repository not found: ${repositoryInput.source}`,
      );
    const variantCount = await prisma.promptRepository.count({
      where: { sourcePromptId: source.id },
    });
    await prisma.promptRepository.update({
      where: { id: source.id },
      data: { variantCount },
    });
  }

  const official = accounts.get('vrompt-official');
  const starter = accounts.get('vrompt-starter');
  const promptLab = accounts.get('prompt-lab-starter');
  if (!official || !starter || !promptLab)
    throw new Error('Seed accounts are incomplete');

  await seedCollection(
    official.id,
    'Vrompt Starter Kit',
    'Officially curated starter repositories for learning the Vrompt workflow.',
    [
      'vrompt-official-prompt-review-checklist',
      'vrompt-starter-meeting-notes',
      'vrompt-starter-research-synthesis',
    ],
    repositories,
  );
  await seedCollection(
    starter.id,
    'First Week Prompt Pack',
    'Starter content for trying repository-based prompt development.',
    ['vrompt-starter-meeting-notes', 'vrompt-starter-product-brief'],
    repositories,
  );
  await seedCollection(
    promptLab.id,
    'Prompt Lab Variants',
    'A labeled starter collection showing how prompt variants can diverge.',
    ['vrompt-starter-product-brief', 'vrompt-starter-product-brief-concise'],
    repositories,
  );

  console.log(
    `Seeded ${officialCategories.length} official categories, ${seedUsers.length} labeled accounts, ${seedRepositories.length} repositories, and 3 starter collections.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
