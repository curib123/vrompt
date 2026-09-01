import {
  AccountType,
  ActivityType,
  CollectionVisibility,
  CommentStatus,
  NotificationType,
  PrismaClient,
  PromptRepositoryStatus,
  PromptVersionStatus,
  PromptVisibility,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';

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

const officialAudiences = [
  {
    name: 'Developers',
    description: 'People building software, systems, and technical products.',
  },
  {
    name: 'Designers',
    description: 'People shaping visual, product, and user experiences.',
  },
  {
    name: 'Students',
    description: 'People learning, practicing, and building new skills.',
  },
  {
    name: 'Researchers',
    description: 'People investigating questions and synthesizing evidence.',
  },
  {
    name: 'Marketers',
    description: 'People planning campaigns, messaging, and growth work.',
  },
  {
    name: 'Content Creators',
    description:
      'People producing stories, media, and audience-facing content.',
  },
  {
    name: 'Business Users',
    description: 'People making decisions and improving business workflows.',
  },
  {
    name: 'Productivity Users',
    description: 'People organizing work, planning, and everyday tasks.',
  },
  {
    name: 'AI Power Users',
    description: 'People exploring advanced and repeatable AI workflows.',
  },
  {
    name: 'Prompt Creators',
    description: 'People designing, testing, and sharing reusable prompts.',
  },
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

const TARGET_REPOSITORY_COUNT = 1_000;
const GENERATED_USER_COUNT = 100;

const generatedTopics = [
  {
    category: 'Coding',
    noun: 'API integration plan',
    verb: 'design a reliable API integration',
    tags: ['api', 'engineering', 'documentation'],
  },
  {
    category: 'Design',
    noun: 'product critique',
    verb: 'critique a product interface',
    tags: ['ux', 'ui', 'feedback'],
  },
  {
    category: 'Writing',
    noun: 'editorial outline',
    verb: 'shape an editorial outline',
    tags: ['writing', 'editing', 'content'],
  },
  {
    category: 'Business',
    noun: 'decision brief',
    verb: 'turn business context into a decision brief',
    tags: ['strategy', 'decisions', 'planning'],
  },
  {
    category: 'Marketing',
    noun: 'campaign concept',
    verb: 'develop a measurable campaign concept',
    tags: ['campaigns', 'copywriting', 'growth'],
  },
  {
    category: 'Education',
    noun: 'lesson plan',
    verb: 'build an accessible lesson plan',
    tags: ['teaching', 'learning', 'curriculum'],
  },
  {
    category: 'Research',
    noun: 'research synthesis',
    verb: 'synthesize research notes with uncertainty',
    tags: ['research', 'synthesis', 'sources'],
  },
  {
    category: 'Productivity',
    noun: 'weekly planning system',
    verb: 'organize a practical weekly planning system',
    tags: ['planning', 'workflow', 'focus'],
  },
  {
    category: 'Data Analysis',
    noun: 'metrics review',
    verb: 'analyze a metrics snapshot',
    tags: ['analytics', 'metrics', 'data'],
  },
  {
    category: 'Image Generation',
    noun: 'visual direction brief',
    verb: 'write a clear visual direction brief',
    tags: ['image-generation', 'art-direction', 'visuals'],
  },
  {
    category: 'Career',
    noun: 'career narrative',
    verb: 'improve a career narrative',
    tags: ['career', 'interviews', 'professional'],
  },
  {
    category: 'Entertainment',
    noun: 'story development pass',
    verb: 'develop a story concept',
    tags: ['storytelling', 'creative', 'characters'],
  },
  {
    category: 'Other',
    noun: 'structured thinking guide',
    verb: 'turn an open question into a structured thinking guide',
    tags: ['thinking', 'frameworks', 'clarity'],
  },
] as const;

function stableUuid(key: string) {
  const hex = createHash('sha256')
    .update(`vrompt-development-seed:${key}`)
    .digest('hex')
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

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

async function seedAudiences() {
  for (const [sortOrder, audience] of officialAudiences.entries()) {
    await prisma.audience.upsert({
      where: { slug: slugify(audience.name) },
      update: {
        name: audience.name,
        description: audience.description,
        isActive: true,
        sortOrder,
      },
      create: {
        name: audience.name,
        slug: slugify(audience.name),
        description: audience.description,
        isActive: true,
        sortOrder,
      },
    });
  }
}

async function audienceIdsForCategory(category: string) {
  const names: Record<string, string[]> = {
    Coding: ['Developers', 'AI Power Users'],
    Design: ['Designers', 'Content Creators'],
    Writing: ['Content Creators', 'Prompt Creators'],
    Business: ['Business Users', 'Marketers'],
    Marketing: ['Marketers', 'Business Users'],
    Education: ['Students', 'Researchers'],
    Research: ['Researchers', 'AI Power Users'],
    Productivity: ['Productivity Users', 'Business Users'],
    'Data Analysis': ['Researchers', 'Business Users'],
    'Image Generation': ['Designers', 'Content Creators'],
    Career: ['Business Users', 'Students'],
    Entertainment: ['Content Creators', 'AI Power Users'],
    Other: ['AI Power Users', 'Prompt Creators'],
  };
  const rows = await prisma.audience.findMany({
    where: { name: { in: names[category] ?? ['AI Power Users'] } },
    select: { id: true },
  });
  return rows.map(({ id }) => id);
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

async function seedGeneratedAccounts() {
  const accounts = Array.from({ length: GENERATED_USER_COUNT }, (_, index) => {
    const number = String(index + 1).padStart(3, '0');
    const username = `demo-creator-${number}`;
    return {
      id: stableUuid(`user:${username}`),
      email: `${username}@vrompt.local`,
      username,
      googleId: `seed:${username}`,
      displayName: `Creator ${number}`,
      bio: `A demo creator sharing practical ${generatedTopics[index % generatedTopics.length].category.toLowerCase()} workflows on Vrompt.`,
    };
  });

  await prisma.user.createMany({
    data: accounts.map((account) => ({
      id: account.id,
      email: account.email,
      username: account.username,
      googleId: account.googleId,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      accountType: AccountType.REAL,
    })),
    skipDuplicates: true,
  });
  await prisma.profile.createMany({
    data: accounts.map((account) => ({
      id: stableUuid(`profile:${account.username}`),
      userId: account.id,
      displayName: account.displayName,
      bio: account.bio,
    })),
    skipDuplicates: true,
  });

  return accounts;
}

async function seedGeneratedCatalog(
  accounts: Awaited<ReturnType<typeof seedGeneratedAccounts>>,
) {
  const categoryRows = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  const categories = new Map(
    categoryRows.map((category) => [category.slug, category.id]),
  );
  const generatedCount = Math.max(
    TARGET_REPOSITORY_COUNT - seedRepositories.length,
    0,
  );
  const repositories = Array.from({ length: generatedCount }, (_, index) => {
    const number = index + 1;
    const topic = generatedTopics[index % generatedTopics.length];
    const owner = accounts[index % accounts.length];
    const slug = `vrompt-demo-${String(number).padStart(4, '0')}-${slugify(topic.noun)}`;
    const repositoryId = stableUuid(`repository:${slug}`);
    const versionId = stableUuid(`version:${slug}:1`);
    const source =
      number > 1 && number % 17 === 0
        ? stableUuid(
            `repository:vrompt-demo-${String(number - 1).padStart(4, '0')}-${slugify(generatedTopics[(index - 1) % generatedTopics.length].noun)}`,
          )
        : null;
    return {
      number,
      slug,
      repositoryId,
      versionId,
      ownerId: owner.id,
      categoryId: categories.get(slugify(topic.category)),
      sourcePromptId: source,
      rootPromptId: source,
      topic,
    };
  });

  if (repositories.some((repository) => !repository.categoryId)) {
    throw new Error('Generated catalog contains an unknown category');
  }

  await prisma.promptRepository.createMany({
    data: repositories.map((repository) => ({
      id: repository.repositoryId,
      ownerId: repository.ownerId,
      categoryId: repository.categoryId as string,
      sourcePromptId: repository.sourcePromptId,
      rootPromptId: repository.rootPromptId,
      title: `${repository.topic.noun} ${repository.number}`,
      slug: repository.slug,
      description: `A practical workflow to ${repository.topic.verb} for a modern team. It favors clear assumptions, useful constraints, and an output that can be reviewed.`,
      aiCompatibility: ['GPT-4.1', 'Claude', 'Gemini'][repository.number % 3],
      visibility: PromptVisibility.PUBLIC,
      status: PromptRepositoryStatus.ACTIVE,
      license: 'CC BY 4.0',
    })),
    skipDuplicates: true,
  });
  await prisma.promptVersion.createMany({
    data: repositories.map((repository) => ({
      id: repository.versionId,
      repositoryId: repository.repositoryId,
      authorId: repository.ownerId,
      versionNumber: 1,
      content: `You are a thoughtful ${repository.topic.category.toLowerCase()} collaborator. Help me ${repository.topic.verb}.\n\nContext:\n{{context}}\n\nRequirements:\n- State important assumptions before making recommendations.\n- Separate facts, interpretation, and open questions.\n- Produce a concise, structured result that a teammate can review.\n- Do not invent missing details; ask for them when they materially change the result.`,
      changelog: 'Initial seeded version for the development catalog.',
      status: PromptVersionStatus.PUBLISHED,
      publishedAt: new Date(
        Date.UTC(2025, repository.number % 12, (repository.number % 27) + 1),
      ),
    })),
    skipDuplicates: true,
  });
  await prisma.$executeRaw`
    UPDATE "PromptRepository" AS repository
    SET "currentVersionId" = version.id
    FROM "PromptVersion" AS version
    WHERE version."repositoryId" = repository.id
      AND version."versionNumber" = 1
      AND repository.slug LIKE 'vrompt-demo-%'
  `;

  const tags = Array.from(
    new Map(
      repositories.flatMap((repository) =>
        repository.topic.tags.map((name) => [name, name] as const),
      ),
    ).values(),
  );
  await prisma.tag.createMany({
    data: tags.map((name) => ({
      id: stableUuid(`tag:${name}`),
      name,
      normalizedName: name,
      slug: slugify(name),
      isOfficial: false,
    })),
    skipDuplicates: true,
  });
  const tagRows = await prisma.tag.findMany({
    where: { normalizedName: { in: tags } },
    select: { id: true, normalizedName: true },
  });
  const tagIds = new Map(tagRows.map((tag) => [tag.normalizedName, tag.id]));
  await prisma.promptTag.createMany({
    data: repositories.flatMap((repository) =>
      repository.topic.tags.map((name) => ({
        promptRepositoryId: repository.repositoryId,
        tagId: tagIds.get(name) as string,
      })),
    ),
    skipDuplicates: true,
  });
  const promptAudiences = (
    await Promise.all(
      repositories.map(async (repository) =>
        (await audienceIdsForCategory(repository.topic.category)).map(
          (audienceId) => ({
            promptRepositoryId: repository.repositoryId,
            audienceId,
          }),
        ),
      ),
    )
  ).flat();
  await prisma.promptAudience.createMany({
    data: promptAudiences,
    skipDuplicates: true,
  });

  await prisma.promptVariable.createMany({
    data: repositories.map((repository) => ({
      id: stableUuid(`variable:${repository.slug}:context`),
      promptVersionId: repository.versionId,
      name: 'context',
      description: 'The relevant context, notes, or source material.',
      required: true,
      sortOrder: 0,
    })),
    skipDuplicates: true,
  });
  await prisma.promptExample.createMany({
    data: repositories.map((repository) => ({
      id: stableUuid(`example:${repository.slug}:1`),
      promptVersionId: repository.versionId,
      title: 'Seeded workflow example',
      input: 'A team needs a clear first draft from messy notes.',
      output:
        'Return a structured draft, list assumptions, and identify open questions.',
      sortOrder: 0,
    })),
    skipDuplicates: true,
  });

  await prisma.$executeRaw`
    UPDATE "PromptRepository" AS repository
    SET "variantCount" = counts.total
    FROM (
      SELECT "sourcePromptId", COUNT(*)::integer AS total
      FROM "PromptRepository"
      WHERE "sourcePromptId" IS NOT NULL
      GROUP BY "sourcePromptId"
    ) AS counts
    WHERE repository.id = counts."sourcePromptId"
  `;

  return repositories;
}

async function seedGeneratedInteractions(
  accounts: Awaited<ReturnType<typeof seedGeneratedAccounts>>,
  repositories: Awaited<ReturnType<typeof seedGeneratedCatalog>>,
) {
  const audiences = await prisma.audience.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  });
  await prisma.userAudience.createMany({
    data: accounts.flatMap((account, index) =>
      [0, 3].map((offset) => ({
        userId: account.id,
        audienceId: audiences[(index + offset) % audiences.length]!.id,
      })),
    ),
    skipDuplicates: true,
  });
  const repositoryIds = repositories.map(
    (repository) => repository.repositoryId,
  );
  const follows = accounts.flatMap((account, index) =>
    [1, 2, 3].map((offset) => ({
      followerId: account.id,
      followingId: accounts[(index + offset) % accounts.length].id,
    })),
  );
  await prisma.follow.createMany({ data: follows, skipDuplicates: true });

  const likes = accounts.flatMap((account, index) =>
    Array.from({ length: 12 }, (_, offset) => ({
      userId: account.id,
      promptRepositoryId:
        repositoryIds[(index * 13 + offset * 7) % repositoryIds.length],
    })),
  );
  await prisma.like.createMany({ data: likes, skipDuplicates: true });

  const bookmarks = accounts.flatMap((account, index) =>
    Array.from({ length: 5 }, (_, offset) => ({
      userId: account.id,
      promptRepositoryId:
        repositoryIds[(index * 17 + offset * 11) % repositoryIds.length],
    })),
  );
  await prisma.bookmark.createMany({ data: bookmarks, skipDuplicates: true });

  const copyEvents = accounts.flatMap((account, index) =>
    Array.from({ length: 8 }, (_, offset) => {
      const repository =
        repositories[(index * 29 + offset * 13) % repositories.length];
      return {
        id: stableUuid(`copy:${index + 1}:${offset + 1}`),
        userId: account.id,
        promptRepositoryId: repository.repositoryId,
        promptVersionId: repository.versionId,
        dedupeKey: `development-seed-copy:${index + 1}:${offset + 1}`,
      };
    }),
  );
  await prisma.promptCopyEvent.createMany({
    data: copyEvents,
    skipDuplicates: true,
  });

  await prisma.$executeRaw`
    UPDATE "PromptRepository" AS repository
    SET "likeCount" = counts.likes
    FROM (
      SELECT "promptRepositoryId", COUNT(*)::integer AS likes
      FROM "Like"
      GROUP BY "promptRepositoryId"
    ) AS counts
    WHERE repository.id = counts."promptRepositoryId"
  `;
  await prisma.$executeRaw`
    UPDATE "PromptRepository" AS repository
    SET "saveCount" = counts.saves
    FROM (
      SELECT "promptRepositoryId", COUNT(*)::integer AS saves
      FROM "Bookmark"
      GROUP BY "promptRepositoryId"
    ) AS counts
    WHERE repository.id = counts."promptRepositoryId"
  `;
  await prisma.$executeRaw`
    UPDATE "PromptRepository" AS repository
    SET "copyCount" = counts.copies
    FROM (
      SELECT "promptRepositoryId", COUNT(*)::integer AS copies
      FROM "PromptCopyEvent"
      GROUP BY "promptRepositoryId"
    ) AS counts
    WHERE repository.id = counts."promptRepositoryId"
  `;

  const comments = Array.from({ length: 300 }, (_, index) => {
    const repository = repositories[index % repositories.length];
    const account = accounts[(index * 7) % accounts.length];
    return {
      id: stableUuid(`comment:demo:${index + 1}`),
      userId: account.id,
      promptRepositoryId: repository.repositoryId,
      content: [
        'The constraints make this workflow easy to adapt.',
        'I like the separation between assumptions and recommendations.',
        'This is a useful starting point for a team review.',
        'The output format is clear enough to reuse in a real project.',
      ][index % 4],
      status: CommentStatus.VISIBLE,
    };
  });
  await prisma.comment.createMany({ data: comments, skipDuplicates: true });

  const collections = accounts.map((account, index) => ({
    id: stableUuid(`collection:demo:${index + 1}`),
    ownerId: account.id,
    name: `${generatedTopics[index % generatedTopics.length].category} Workflows`,
    slug: `demo-${String(index + 1).padStart(3, '0')}-workflows`,
    description:
      'A public set of practical prompt workflows from the development catalog.',
    visibility: CollectionVisibility.PUBLIC,
  }));
  await prisma.collection.createMany({
    data: collections,
    skipDuplicates: true,
  });
  await prisma.collectionPrompt.createMany({
    data: collections.flatMap((collection, index) =>
      Array.from({ length: 5 }, (_, offset) => ({
        collectionId: collection.id,
        promptRepositoryId:
          repositoryIds[(index * 19 + offset * 23) % repositoryIds.length],
        sortOrder: offset,
      })),
    ),
    skipDuplicates: true,
  });

  const activities = repositories.flatMap((repository, index) => {
    const account = accounts[index % accounts.length];
    return [
      {
        id: stableUuid(`activity:repository:${repository.slug}`),
        actorId: account.id,
        promptRepositoryId: repository.repositoryId,
        type: ActivityType.REPOSITORY_CREATED,
        metadata: { source: 'development-seed' },
      },
      {
        id: stableUuid(`activity:version:${repository.slug}`),
        actorId: account.id,
        promptRepositoryId: repository.repositoryId,
        type: ActivityType.VERSION_PUBLISHED,
        metadata: { version: 1 },
      },
    ];
  });
  await prisma.activityEvent.createMany({
    data: activities,
    skipDuplicates: true,
  });

  const analyticsNames = [
    'repository_viewed',
    'search_performed',
    'prompt_copied',
    'prompt_saved',
    'repository_liked',
    'comment_created',
    'collection_created',
  ] as const;
  await prisma.analyticsEvent.createMany({
    data: Array.from({ length: 2_000 }, (_, index) => ({
      id: stableUuid(`analytics:demo:${index + 1}`),
      name: analyticsNames[index % analyticsNames.length],
      actorId: accounts[(index * 5) % accounts.length].id,
      accountType: AccountType.REAL,
      metadata: { source: 'development-seed' },
    })),
    skipDuplicates: true,
  });

  const notifications = Array.from({ length: 500 }, (_, index) => ({
    id: stableUuid(`notification:demo:${index + 1}`),
    recipientId: accounts[index % accounts.length].id,
    actorId: accounts[(index + 1) % accounts.length].id,
    promptRepositoryId: repositoryIds[index % repositoryIds.length],
    type:
      index % 2 === 0
        ? NotificationType.PROMPT_LIKED
        : NotificationType.NEW_FOLLOWER,
  }));
  await prisma.notification.createMany({
    data: notifications,
    skipDuplicates: true,
  });
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
  await prisma.promptAudience.deleteMany({
    where: { promptRepositoryId: repository.id },
  });
  const audienceIds = await audienceIdsForCategory(repositoryInput.category);
  await prisma.promptAudience.createMany({
    data: audienceIds.map((audienceId) => ({
      promptRepositoryId: repository.id,
      audienceId,
    })),
    skipDuplicates: true,
  });

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
  await seedAudiences();
  const accounts = await seedAccounts();
  const generatedAccounts = await seedGeneratedAccounts();
  const repositories = new Map<
    string,
    { id: string; rootPromptId: string | null }
  >();

  for (const repository of seedRepositories) {
    await seedRepository(repository, accounts, repositories);
  }

  const generatedRepositories = await seedGeneratedCatalog(generatedAccounts);
  await seedGeneratedInteractions(generatedAccounts, generatedRepositories);

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
    `Seeded ${officialCategories.length} categories, ${seedUsers.length + generatedAccounts.length} demo accounts, ${seedRepositories.length + generatedRepositories.length} repositories, and connected demo interactions.`,
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
