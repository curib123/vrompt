import { expect, test } from '@playwright/test';

const apiOrigin = 'http://localhost:4000/api/v1';
const now = '2026-08-30T00:00:00.000Z';

type TestUser = {
  id: string;
  email: string;
  username: string;
  role: 'USER';
  accountType: 'REAL';
};

const author: TestUser = {
  id: 'user-a',
  email: 'author@example.com',
  username: 'author',
  role: 'USER',
  accountType: 'REAL',
};

const explorer: TestUser = {
  id: 'user-b',
  email: 'explorer@example.com',
  username: 'explorer',
  role: 'USER',
  accountType: 'REAL',
};

function evidence(id: string, filename: string) {
  return {
    id,
    secureUrl: `http://localhost:4000/media/${filename}`,
    originalFilename: filename,
    mimeType: 'image/png',
    altText: `${filename} alt text`,
    caption: `${filename} caption`,
    sortOrder: Number(id.replace(/\D/g, '')) || 0,
  };
}

function version(
  id: string,
  versionNumber: number,
  content: string,
  evidenceImages: ReturnType<typeof evidence>[],
) {
  return {
    id,
    versionNumber,
    content,
    changelog: versionNumber === 1 ? 'First release' : 'Improved structure',
    status: 'PUBLISHED' as const,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    variables: [],
    examples: [],
    evidenceImages,
  };
}

function repository(
  slug: string,
  owner: TestUser,
  currentVersion: ReturnType<typeof version>,
  sourcePrompt: {
    title: string;
    slug: string;
    owner: { username: string };
  } | null = null,
) {
  return {
    id: slug === 'prompt-a' ? 'repo-a' : 'repo-variant',
    ownerId: owner.id,
    title: slug === 'prompt-a' ? 'Prompt A' : 'Prompt A Variant',
    slug,
    description: 'A reusable prompt for focused work.',
    aiCompatibility: 'GPT-5',
    visibility: 'PUBLIC' as const,
    status: 'ACTIVE' as const,
    license: 'CC BY 4.0',
    createdAt: now,
    updatedAt: now,
    copyCount: 0,
    saveCount: 0,
    likeCount: 0,
    isSaved: false,
    isLiked: false,
    variantCount: slug === 'prompt-a' ? 1 : 0,
    sourcePromptId: sourcePrompt ? 'repo-a' : null,
    rootPromptId: sourcePrompt ? 'repo-a' : null,
    owner: {
      username: owner.username,
      status: 'ACTIVE' as const,
      profile: {
        displayName: owner.username === 'author' ? 'Author A' : 'Explorer B',
        avatar: null,
      },
    },
    category: { name: 'Writing', slug: 'writing' },
    sourcePrompt,
    promptTags: [],
    currentVersion,
  };
}

function profile(user: TestUser, isFollowing = false) {
  return {
    id: user.id,
    username: user.username,
    accountType: user.accountType,
    displayName: user.username === 'author' ? 'Author A' : 'Explorer B',
    bio: 'Building useful prompts.',
    avatar: null,
    website: null,
    createdAt: now,
    stats: { repositories: 1, followers: 0, following: 0 },
    isFollowing,
    repositories: [],
    collections: [],
  };
}

function pngFile(name: string) {
  return {
    name,
    mimeType: 'image/png',
    buffer: Buffer.from('\x89PNG\r\n\x1a\n', 'binary'),
  };
}

test.use({ viewport: { width: 390, height: 844 } });

test('prioritizes Google sign-in on the mobile login screen', async ({
  page,
}) => {
  await page.route(`${apiOrigin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/v1/auth/refresh') {
      await route.fulfill({ status: 401, json: { message: 'Signed out' } });
      return;
    }
    await route.abort();
  });

  await page.goto('/login');

  const googleButton = page.getByRole('button', {
    name: 'Continue with Google',
  });
  const benefitsHeading = page.getByRole('heading', {
    name: 'Keep the prompts that move your work forward.',
  });
  await expect(googleButton).toBeVisible();
  await expect(page.getByText('Nothing here yet')).toHaveCount(0);
  await expect(page.getByText(/coming soon/i)).toHaveCount(0);

  const googleButtonBox = await googleButton.boundingBox();
  const benefitsHeadingBox = await benefitsHeading.boundingBox();
  expect(googleButtonBox?.y).toBeLessThan(
    benefitsHeadingBox?.y ?? Number.POSITIVE_INFINITY,
  );
});

test('keeps the signed-out desktop navigation focused', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route(`${apiOrigin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/v1/auth/refresh') {
      await route.fulfill({ status: 401, json: { message: 'Signed out' } });
      return;
    }
    await route.abort();
  });

  await page.goto('/');

  const navigation = page.getByRole('navigation', {
    name: 'Primary navigation',
  });
  await expect(navigation.getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Explore' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Search' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Create' })).toHaveCount(0);
  await expect(navigation.getByRole('link', { name: 'Saved' })).toHaveCount(0);
  await expect(navigation.getByRole('link', { name: 'Following' })).toHaveCount(
    0,
  );
  const header = page.getByRole('banner');
  await expect(header.getByRole('link', { name: 'Login' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Join Vrompt' })).toBeVisible();
});

test('opens the mobile navigation drawer from the left-side hamburger', async ({
  page,
}) => {
  await page.route(`${apiOrigin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/v1/auth/refresh') {
      await route.fulfill({
        status: 401,
        json: { message: 'Signed out' },
      });
      return;
    }
    await route.abort();
  });

  await page.goto('/');
  const hamburger = page.getByRole('button', { name: 'Open navigation' });
  const homeLink = page.getByRole('link', { name: 'Vrompt home' });
  const hamburgerBox = await hamburger.boundingBox();
  const homeLinkBox = await homeLink.boundingBox();
  expect(hamburgerBox?.x).toBeLessThan(
    homeLinkBox?.x ?? Number.POSITIVE_INFINITY,
  );
  expect(
    (homeLinkBox?.x ?? 0) -
      ((hamburgerBox?.x ?? 0) + (hamburgerBox?.width ?? 0)),
  ).toBeLessThanOrEqual(16);
  await hamburger.click();

  const drawer = page.getByRole('dialog', {
    name: 'Mobile navigation drawer',
  });
  await expect(drawer).toBeVisible();
  const closeButton = drawer.getByRole('button', {
    name: 'Close navigation',
  });
  await expect(closeButton).toBeFocused();
  await expect(drawer.getByRole('link', { name: 'Explore' })).toBeVisible();
  await expect(drawer.getByRole('link', { name: 'Join Vrompt' })).toBeVisible();
  await expect(drawer.getByRole('link', { name: 'Create' })).toHaveCount(0);
  await expect(drawer.getByRole('link', { name: 'Saved' })).toHaveCount(0);
  await expect(drawer.getByRole('link', { name: 'Settings' })).toHaveCount(0);

  await expect
    .poll(async () => (await drawer.boundingBox())?.x)
    .toBeCloseTo(0, 1);

  await closeButton.click();
  await expect(drawer).not.toBeVisible();
});

test('searches prompts from Explore with advanced filters', async ({ page }) => {
  await page.route(`${apiOrigin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/v1/auth/refresh') {
      await route.fulfill({ status: 401, json: { message: 'Signed out' } });
      return;
    }
    if (url.pathname === '/api/v1/search/explore') {
      await route.fulfill({
        json: {
          featured: [],
          popular: [],
          recentlyUpdated: [],
          mostCopied: [],
          mostSaved: [],
          mostVariants: [],
          categories: [
            { id: 'category-writing', name: 'Writing', slug: 'writing' },
          ],
          starterCollections: [],
        },
      });
      return;
    }
    if (url.pathname === '/api/v1/search') {
      await route.fulfill({
        json: {
          items: [],
          page: 1,
          pageSize: 20,
          total: 0,
          hasNextPage: false,
        },
      });
      return;
    }
    await route.abort();
  });

  await page.goto('/explore');
  await page.getByLabel('Search prompts').fill('research brief');
  await page.locator('summary').filter({ hasText: 'Advanced filters' }).click();
  await page.getByLabel('Category').selectOption('writing');
  await page.getByLabel('AI compatibility').fill('GPT-5');
  await page.getByLabel('Sort results').selectOption('copies');
  await page.getByRole('button', { name: 'Search prompts' }).click();

  await page.waitForURL((url) => {
    return (
      url.pathname === '/search' &&
      url.searchParams.get('q') === 'research brief' &&
      url.searchParams.get('category') === 'writing' &&
      url.searchParams.get('aiCompatibility') === 'GPT-5' &&
      url.searchParams.get('sort') === 'copies'
    );
  });
});

test('completes the two-user prompt and evidence journey on mobile', async ({
  page,
}) => {
  let currentUser = author;
  let promptVersion = version(
    'version-1',
    1,
    'Write a concise research brief.',
    [
      evidence('evidence-1', 'v1-one.png'),
      evidence('evidence-2', 'v1-two.png'),
      evidence('evidence-3', 'v1-three.png'),
    ],
  );
  let variantVersion = version(
    'variant-version-1',
    1,
    'Write a concise research brief.',
    [],
  );
  let variantCreated = false;

  await page.route(`${apiOrigin}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    const method = request.method();

    if (path === '/auth/refresh' && method === 'POST') {
      await route.fulfill({
        json: { accessToken: `token-${currentUser.id}`, user: currentUser },
      });
      return;
    }
    if (path === '/profiles/me' && method === 'GET') {
      await route.fulfill({ json: profile(currentUser) });
      return;
    }
    if (path === '/profiles/me' && method === 'PATCH') {
      await route.fulfill({ json: profile(currentUser) });
      return;
    }
    if (path === '/categories') {
      await route.fulfill({
        json: [{ id: 'category-writing', name: 'Writing', slug: 'writing' }],
      });
      return;
    }
    if (path.startsWith('/tags')) {
      await route.fulfill({ json: [] });
      return;
    }
    if (path === '/prompt-repositories' && method === 'POST') {
      await route.fulfill({
        json: { id: 'repo-a', slug: 'prompt-a', promptVersionId: 'version-1' },
      });
      return;
    }
    if (
      path === '/prompt-repositories/prompt-a/variants' &&
      method === 'POST'
    ) {
      variantCreated = true;
      await route.fulfill({
        json: {
          id: 'repo-variant',
          slug: 'prompt-a-variant',
          promptVersionId: 'variant-version-1',
        },
      });
      return;
    }
    if (path.includes('/evidence-images') && method === 'POST') {
      const promptVersionId = path.split('/')[2];
      if (promptVersionId === 'version-1') {
        promptVersion = {
          ...promptVersion,
          evidenceImages: promptVersion.evidenceImages,
        };
      } else {
        variantVersion = {
          ...variantVersion,
          evidenceImages: [evidence('variant-evidence-1', 'variant.png')],
        };
      }
      await route.fulfill({ json: {} });
      return;
    }
    if (path === '/prompt-repositories/prompt-a' && method === 'GET') {
      await route.fulfill({
        json: repository('prompt-a', author, promptVersion),
      });
      return;
    }
    if (path === '/prompt-repositories/prompt-a-variant' && method === 'GET') {
      await route.fulfill({
        json: repository('prompt-a-variant', explorer, variantVersion, {
          title: 'Prompt A',
          slug: 'prompt-a',
          owner: { username: 'author' },
        }),
      });
      return;
    }
    if (
      path === '/prompt-repositories/prompt-a/versions' &&
      method === 'POST'
    ) {
      promptVersion = version(
        'version-2',
        2,
        'Write a concise research brief with sources.',
        [evidence('evidence-4', 'v2.png')],
      );
      await route.fulfill({ json: promptVersion });
      return;
    }
    if (path.endsWith('/versions')) {
      await route.fulfill({
        json: [
          {
            ...(path.includes('prompt-a-variant')
              ? variantVersion
              : promptVersion),
            author: {
              username: path.includes('prompt-a-variant')
                ? 'explorer'
                : 'author',
            },
          },
        ],
      });
      return;
    }
    if (path === '/prompt-repositories/prompt-a/copy' && method === 'POST') {
      await route.fulfill({ json: { copyCount: 1 } });
      return;
    }
    if (path === '/prompt-repositories/prompt-a/save' && method === 'POST') {
      await route.fulfill({ json: { saved: true, saveCount: 1 } });
      return;
    }
    if (path === '/profiles/author/follow' && method === 'POST') {
      await route.fulfill({ json: { following: true, followerCount: 1 } });
      return;
    }
    if (path === '/profiles/author' && method === 'GET') {
      await route.fulfill({ json: profile(author, false) });
      return;
    }
    if (path.endsWith('/comments')) {
      await route.fulfill({
        json: {
          items: [],
          page: 1,
          pageSize: 20,
          total: 0,
          hasNextPage: false,
        },
      });
      return;
    }
    if (path.endsWith('/activity')) {
      await route.fulfill({ json: [] });
      return;
    }
    if (path === '/search') {
      await route.fulfill({
        json: {
          items: [
            {
              id: 'repo-a',
              title: 'Prompt A',
              slug: 'prompt-a',
              description: 'A reusable prompt for focused work.',
              aiCompatibility: 'GPT-5',
              visibility: 'PUBLIC',
              copyCount: 0,
              saveCount: 0,
              likeCount: 0,
              variantCount: 1,
              updatedAt: now,
              owner: { username: 'author', accountType: 'REAL' },
              category: { name: 'Writing', slug: 'writing' },
              promptTags: [],
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          hasNextPage: false,
        },
      });
      return;
    }
    if (path === '/notifications') {
      await route.fulfill({
        json: {
          items: [
            {
              id: 'notification-1',
              type: 'VARIANT_CREATED',
              readAt: null,
              createdAt: now,
              actor: { username: 'explorer' },
              promptRepository: { title: 'Prompt A', slug: 'prompt-a' },
              comment: null,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          unreadCount: 1,
          hasNextPage: false,
        },
      });
      return;
    }
    if (
      path.startsWith('/notifications/') ||
      path === '/notifications/read-all'
    ) {
      await route.fulfill({ json: {} });
      return;
    }
    await route.fulfill({ json: {} });
  });

  await page.goto('/login');
  await expect(
    page.getByRole('button', { name: 'Continue with Google' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Create an account' }),
  ).toBeVisible();

  await page.goto('/settings');
  await expect(
    page.getByRole('heading', { name: 'Make your profile yours.' }),
  ).toBeVisible();
  await page.getByLabel('Display name').fill('Author A');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile updated.')).toBeVisible();

  await page.goto('/create');
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Prompt A');
  await page
    .getByLabel('Description')
    .fill('A reusable prompt for focused work.');
  await page.getByLabel('AI compatibility').fill('GPT-5');
  await page
    .getByLabel('Prompt content')
    .fill('Write a concise research brief.');
  await page.getByLabel('Visibility').selectOption('PUBLIC');
  await page
    .locator('input[type="file"]')
    .setInputFiles([
      pngFile('v1-one.png'),
      pngFile('v1-two.png'),
      pngFile('v1-three.png'),
    ]);
  await expect(page.getByText('3/3 images.')).toBeVisible();
  await page.getByLabel('Evidence 1 alt text').fill('First result');
  await page.getByLabel('Evidence 2 caption').fill('Second result');
  await page.getByLabel('Evidence 3 alt text').fill('Third result');
  await page.getByRole('button', { name: 'Save repository' }).click();
  await page.waitForURL('**/p/prompt-a');

  await page.getByRole('button', { name: 'Copy Prompt' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();

  await page.getByRole('tab', { name: 'Versions' }).click();
  await expect(page.getByRole('button', { name: /Version 1/ })).toBeVisible();
  await page
    .getByLabel('New version prompt content')
    .fill('Write a concise research brief with sources.');
  await page.getByLabel('Version changelog').fill('Improved structure');
  await page.getByRole('button', { name: 'Publish new version' }).click();
  await page.waitForLoadState('networkidle');

  currentUser = explorer;
  await page.goto('/search?q=Prompt+A');
  await expect(page.getByText('1 public repositories')).toBeVisible();
  await page.getByRole('link', { name: 'Prompt A' }).first().click();
  await page.waitForURL('**/p/prompt-a');
  await expect(page.getByRole('heading', { name: 'Prompt A' })).toBeVisible();

  await page.goto('/u/author');
  await expect(page.getByRole('button', { name: 'Follow' })).toBeVisible();
  await page.getByRole('button', { name: 'Follow' }).click();
  await expect(page.getByRole('button', { name: 'Following' })).toBeVisible();

  await page.goto('/p/prompt-a');
  await page.getByRole('link', { name: 'Create Variant' }).click();
  await page.waitForURL('**/create?variantFrom=prompt-a');
  await expect(
    page.getByText(
      'Prefilled from Prompt A. Attribution will be kept automatically.',
    ),
  ).toBeVisible();
  await expect(page.getByText('0/3 images.')).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Prompt A Variant');
  await page
    .locator('input[type="file"]')
    .setInputFiles(pngFile('variant.png'));
  await expect(page.getByText('1/3 images.')).toBeVisible();
  await page.getByRole('button', { name: 'Save repository' }).click();
  await page.waitForURL('**/p/prompt-a-variant');
  await expect(page.getByText('Attribution')).toBeVisible();
  await expect(page.getByRole('link', { name: '@author' })).toBeVisible();
  expect(variantCreated).toBe(true);

  currentUser = author;
  await page.goto('/notifications');
  await expect(page.getByText('created a Variant based on')).toBeVisible();
  await expect(page.getByText('Prompt A')).toBeVisible();
});
