import {
  AccountType,
  ActivityType,
  CollectionVisibility,
  CommentStatus,
  NotificationType,
  OAuthProvider,
  PrismaClient,
  PromptRepositoryStatus,
  PromptVersionStatus,
  PromptVisibility,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import {
  buildPromptContent,
  creatorFirstNames,
  creatorLastNames,
  scenarioAngles,
  seedScenarios,
} from './seed-catalog';

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

const TARGET_REPOSITORY_COUNT = 2_450;
const GENERATED_USER_COUNT = 240;
const BATCH_SIZE = 500;

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

async function createInBatches<T>(
  data: T[],
  create: (batch: T[]) => Promise<unknown>,
) {
  for (let index = 0; index < data.length; index += BATCH_SIZE) {
    await create(data.slice(index, index + BATCH_SIZE));
  }
}

async function clearGeneratedSeedData() {
  await prisma.analyticsEvent.deleteMany({
    where: {
      id: {
        in: Array.from({ length: 2_000 }, (_, index) =>
          stableUuid(`analytics:demo:${index + 1}`),
        ),
      },
    },
  });
  const generatedRepositories = await prisma.promptRepository.findMany({
    where: { slug: { startsWith: 'vrompt-demo-' } },
    select: { id: true },
  });
  const repositoryIds = generatedRepositories.map(({ id }) => id);
  if (repositoryIds.length > 0) {
    await prisma.promptRepository.updateMany({
      where: { id: { in: repositoryIds } },
      data: { currentVersionId: null },
    });
    await prisma.promptRepository.deleteMany({
      where: { id: { in: repositoryIds } },
    });
  }
  await prisma.user.deleteMany({
    where: {
      OR: [
        {
          username: { startsWith: 'demo-creator-' },
          email: { endsWith: '@vrompt.local' },
        },
        { email: { endsWith: '@seed.vrompt.local' } },
      ],
    },
  });
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
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        accountType: seedUser.accountType,
      },
      select: { id: true },
    });

    await prisma.userIdentity.upsert({
      where: {
        provider_providerUserId: {
          provider: OAuthProvider.GOOGLE,
          providerUserId: `seed:${seedUser.username}`,
        },
      },
      update: {
        providerEmail: seedUser.email,
        providerUsername: seedUser.username,
      },
      create: {
        userId: user.id,
        provider: OAuthProvider.GOOGLE,
        providerUserId: `seed:${seedUser.username}`,
        providerEmail: seedUser.email,
        providerUsername: seedUser.username,
      },
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
    const firstName = creatorFirstNames[index % creatorFirstNames.length];
    const lastName =
      creatorLastNames[
        (index * 17 + Math.floor(index / creatorFirstNames.length)) %
          creatorLastNames.length
      ];
    const nameHandle = slugify(`${firstName}-${lastName}`);
    const username =
      index < creatorFirstNames.length
        ? nameHandle
        : `${nameHandle}-${String(Math.floor(index / creatorFirstNames.length) + 1)}`;
    const category = seedScenarios[index % seedScenarios.length].category;
    return {
      id: stableUuid(`user:${username}`),
      email: `${username}@seed.vrompt.local`,
      username,
      providerUserId: `seed:${username}`,
      displayName: `${firstName} ${lastName}`,
      bio: `Sharing practical ${category.toLowerCase()} workflows, reusable templates, and lessons from building with AI.`,
    };
  });

  await prisma.user.createMany({
    data: accounts.map((account) => ({
      id: account.id,
      email: account.email,
      username: account.username,
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
  await prisma.userIdentity.createMany({
    data: accounts.map((account) => ({
      userId: account.id,
      provider: OAuthProvider.GOOGLE,
      providerUserId: account.providerUserId,
      providerEmail: account.email,
      providerUsername: account.username,
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
  const repositories: Array<{
    number: number;
    slug: string;
    repositoryId: string;
    versionId: string;
    versionCount: number;
    ownerId: string;
    categoryId: string | undefined;
    sourcePromptId: string | null;
    rootPromptId: string | null;
    scenario: (typeof seedScenarios)[number];
    angle: (typeof scenarioAngles)[number];
    title: string;
  }> = [];
  for (let index = 0; index < generatedCount; index += 1) {
    const number = index + 1;
    const scenario = seedScenarios[index % seedScenarios.length];
    const cycle = Math.floor(index / seedScenarios.length);
    const angle = scenarioAngles[cycle % scenarioAngles.length];
    const edition = ['Field Guide', 'Team Template', 'Practical Playbook'][
      Math.floor(cycle / scenarioAngles.length) % 3
    ];
    const title = `${scenario.title} — ${angle.name}${cycle >= scenarioAngles.length ? ` ${edition}` : ''}`;
    const owner = accounts[(index * 37 + cycle) % accounts.length];
    const slug = `vrompt-demo-${String(number).padStart(4, '0')}-${slugify(scenario.title)}-${slugify(angle.name)}`;
    const repositoryId = stableUuid(`repository:${slug}`);
    const versionCount =
      number % 11 === 0 ? 4 : number % 5 === 0 ? 3 : number % 2 === 0 ? 2 : 1;
    const source =
      index >= seedScenarios.length && number % 6 === 0
        ? repositories[index - seedScenarios.length]
        : undefined;
    repositories.push({
      number,
      slug,
      repositoryId,
      versionId: stableUuid(`version:${slug}:${versionCount}`),
      versionCount,
      ownerId: owner.id,
      categoryId: categories.get(slugify(scenario.category)),
      sourcePromptId: source?.repositoryId ?? null,
      rootPromptId: source?.rootPromptId ?? source?.repositoryId ?? null,
      scenario,
      angle,
      title,
    });
  }

  if (repositories.some((repository) => !repository.categoryId)) {
    throw new Error('Generated catalog contains an unknown category');
  }

  await createInBatches(
    repositories.map((repository) => ({
      id: repository.repositoryId,
      ownerId: repository.ownerId,
      categoryId: repository.categoryId as string,
      sourcePromptId: repository.sourcePromptId,
      rootPromptId: repository.rootPromptId,
      title: repository.title,
      slug: repository.slug,
      description: `A reusable ${repository.angle.name.toLowerCase()} workflow to ${repository.scenario.action}. Includes structured variables, realistic examples, verification steps, and ${repository.versionCount} published version${repository.versionCount === 1 ? '' : 's'}.`,
      aiCompatibility: 'OpenAI GPT, Claude, Gemini',
      visibility: PromptVisibility.PUBLIC,
      status: PromptRepositoryStatus.ACTIVE,
      license: 'CC BY 4.0',
    })),
    (data) => prisma.promptRepository.createMany({ data }),
  );
  const versions = repositories.flatMap((repository) =>
    Array.from({ length: repository.versionCount }, (_, versionIndex) => {
      const versionNumber = versionIndex + 1;
      return {
        id: stableUuid(`version:${repository.slug}:${versionNumber}`),
        repositoryId: repository.repositoryId,
        authorId: repository.ownerId,
        versionNumber,
        content: buildPromptContent(
          repository.scenario,
          repository.angle,
          versionNumber,
        ),
        changelog: [
          'Initial scenario-specific prompt with explicit inputs and output contract.',
          'Added a reusable result-quality checklist.',
          'Added confidence labels and lightweight validation guidance.',
          'Added an alternative approach for important tradeoffs.',
        ][versionIndex],
        status: PromptVersionStatus.PUBLISHED,
        publishedAt: new Date(
          Date.UTC(
            2025 + Math.floor((repository.number + versionIndex) / 365),
            (repository.number + versionIndex * 2) % 12,
            ((repository.number * 7 + versionIndex) % 27) + 1,
          ),
        ),
      };
    }),
  );
  await createInBatches(versions, (data) =>
    prisma.promptVersion.createMany({ data }),
  );
  await prisma.$executeRaw`
    UPDATE "PromptRepository" AS repository
    SET "currentVersionId" = latest.id
    FROM (
      SELECT DISTINCT ON ("repositoryId") id, "repositoryId"
      FROM "PromptVersion"
      ORDER BY "repositoryId", "versionNumber" DESC
    ) AS latest
    WHERE latest."repositoryId" = repository.id
      AND repository.slug LIKE 'vrompt-demo-%'
  `;

  const tags = Array.from(
    new Map(
      repositories.flatMap((repository) =>
        repository.scenario.tags.map((name) => [name, name] as const),
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
      repository.scenario.tags.map((name) => ({
        promptRepositoryId: repository.repositoryId,
        tagId: tagIds.get(name) as string,
      })),
    ),
    skipDuplicates: true,
  });
  const audienceRows = await prisma.audience.findMany({
    select: { id: true, name: true },
  });
  const audienceIds = new Map(audienceRows.map(({ id, name }) => [name, id]));
  const promptAudiences = repositories.flatMap((repository) =>
    repository.scenario.audiences.map((name) => ({
      promptRepositoryId: repository.repositoryId,
      audienceId: audienceIds.get(name) as string,
    })),
  );
  if (promptAudiences.some(({ audienceId }) => !audienceId)) {
    throw new Error('Generated catalog contains an unknown audience');
  }
  await createInBatches(promptAudiences, (data) =>
    prisma.promptAudience.createMany({ data }),
  );

  const variableDefinitions = [
    ['goal', 'The concrete outcome this prompt should help achieve.'],
    [
      'context',
      'Relevant facts, notes, data, source material, or existing work.',
    ],
    ['audience', 'Who will use or read the result and their knowledge level.'],
    [
      'constraints',
      'Hard limits such as scope, time, budget, policy, format, or tools.',
    ],
  ] as const;
  const variables = versions.flatMap((version) =>
    variableDefinitions.map(([name, description], sortOrder) => ({
      id: stableUuid(`variable:${version.id}:${name}`),
      promptVersionId: version.id,
      name,
      description,
      required: name !== 'constraints',
      sortOrder,
    })),
  );
  await createInBatches(variables, (data) =>
    prisma.promptVariable.createMany({ data }),
  );
  await createInBatches(
    repositories.map((repository) => ({
      id: stableUuid(`example:${repository.slug}:1`),
      promptVersionId: repository.versionId,
      title: repository.scenario.image
        ? 'Sample image direction and expected result'
        : 'Realistic workflow example',
      input: `Goal: ${repository.scenario.exampleInput}\nAudience: ${repository.scenario.audiences.join(' and ')}\nConstraints: Use only the provided facts; keep the result reviewable.`,
      output: repository.scenario.exampleOutput,
      sortOrder: 0,
    })),
    (data) => prisma.promptExample.createMany({ data }),
  );

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
    name: `${seedScenarios[index % seedScenarios.length].category} Workflows ${String(index + 1).padStart(3, '0')}`,
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
        metadata: { version: repository.versionCount },
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
  await clearGeneratedSeedData();
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
    `Seeded ${officialCategories.length} categories, ${seedUsers.length + generatedAccounts.length} sample accounts, ${seedRepositories.length + generatedRepositories.length} repositories, and connected sample interactions.`,
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
