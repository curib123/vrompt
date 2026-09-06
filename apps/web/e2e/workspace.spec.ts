import { expect, test, type Page } from '@playwright/test';

const modelId = '11111111-1111-4111-8111-111111111111';
const conversationId = '22222222-2222-4222-8222-222222222222';
const model = {
  id: modelId,
  provider: 'OPENAI',
  displayName: 'Configured model',
  description: 'A model configured by an administrator.',
  capabilities: ['text'],
  enabled: true,
};
const usage = {
  plan: 'Test plan',
  credits: { remaining: 100, limit: 100 },
  allowances: [
    {
      bucket: 'AUTO',
      dailyLimit: 20,
      dailyRemaining: 20,
      monthlyLimit: 100,
      monthlyRemaining: 100,
      maxFiles: 0,
      maxFileBytes: 0,
      allowedFeatures: ['chat'],
    },
    {
      bucket: modelId,
      dailyLimit: 20,
      dailyRemaining: 20,
      monthlyLimit: 100,
      monthlyRemaining: 100,
      maxFiles: 0,
      maxFileBytes: 0,
      allowedFeatures: ['chat'],
    },
  ],
  resets: { daily: '2026-09-06T00:00:00Z', monthly: '2026-10-01T00:00:00Z' },
};
const plans = {
  checkoutAvailable: true,
  paymentMode: 'test',
  plans: [
    {
      id: 'FREE',
      name: 'Free',
      description: 'Start with Auto.',
      priceCentavos: 0,
      currency: 'USD',
      billingPeriod: 'to get started',
      monthlyCredits: 100,
      manualModelCount: 0,
      allowances: [{ bucket: 'Auto', dailyLimit: 20, monthlyLimit: 100 }],
      features: [],
    },
    {
      id: 'PRO',
      name: 'Vrompt Pro',
      description: 'More room for your work.',
      priceCentavos: 599,
      currency: 'USD',
      billingPeriod: 'every month',
      monthlyCredits: 1000,
      manualModelCount: 1,
      allowances: [{ bucket: 'Auto', dailyLimit: 200, monthlyLimit: 1000 }],
      features: [],
    },
  ],
};

type TestRole = 'USER' | 'ADMIN' | 'guest';
async function mockApi(
  page: Page,
  session: TestRole | (() => TestRole) = 'USER',
) {
  await page.route('**/api/v1/**', async (route) => {
    const role = typeof session === 'function' ? session() : session;
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    let body: unknown = [];
    if (path === '/auth/refresh') {
      if (role === 'guest') {
        await route.fulfill({ status: 401, json: { message: 'Signed out' } });
        return;
      }
      body = {
        accessToken: 'test-token',
        user: {
          id: 'test-user',
          username: 'alex',
          email: 'alex@example.com',
          role,
          onboardingCompleted: true,
        },
      };
    } else if (path === '/settings/public')
      body = {
        'branding.siteName': 'Vrompt',
        'workspace.writePrompt': 'A configured writing starter.',
      };
    else if (path === '/catalog/models' || path === '/workspace/models')
      body = [model];
    else if (path === '/workspace/usage') body = usage;
    else if (path === '/billing/plans') body = plans;
    else if (path === '/billing/me')
      body = { plan: 'FREE', subscription: null, latestPayment: null };
    else if (path === '/workspace/preferences')
      body = { displayName: 'Alex', defaultModelId: null, sendOnEnter: false };
    else if (path === '/guest/configuration')
      body = { enabled: true, dailyLimit: 3, monthlyLimit: 10 };
    else if (
      path === '/workspace/conversations' &&
      route.request().method() === 'POST'
    )
      body = { id: conversationId, title: 'New test conversation' };
    else if (path === `/workspace/conversations/${conversationId}`)
      body = {
        id: conversationId,
        title: 'New test conversation',
        messages: [],
        attachments: [],
      };
    else if (path === '/admin/workspace/configuration')
      body = { models: [model], plans: [], policies: [] };
    else if (path === '/admin/billing/configuration')
      body = { plans: [], promotions: [] };
    await route.fulfill({ json: body });
  });
}

test('landing reflects the catalog and carries an authenticated draft into chat', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/');
  await expect(
    page.getByText('Configured model', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Your message' })
    .fill('Help me plan a launch');
  await page
    .getByRole('button', { name: 'Open chat with your message' })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Message', exact: true }),
  ).toHaveValue('Help me plan a launch');
  await expect(page.getByText('Open administration')).toHaveCount(0);
});

test('chat honors send-button preference and preserves the chosen model on first send', async ({
  page,
}) => {
  await mockApi(page);
  let submitted: Record<string, unknown> | undefined;
  await page.route(
    `**/conversations/${conversationId}/messages`,
    async (route) => {
      submitted = route.request().postDataJSON();
      await route.fulfill({
        contentType: 'text/event-stream',
        body: `data: ${JSON.stringify({ type: 'delta', text: 'Test response' })}\n\ndata: ${JSON.stringify({ type: 'done', status: 'SUCCEEDED', messageId: 'response', usage })}\n\n`,
      });
    },
  );
  await page.goto('/chat');
  await expect(
    page.getByRole('heading', { name: 'Hello, Alex.' }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Choose AI model' })
    .selectOption(modelId);
  await page
    .getByRole('textbox', { name: 'Message', exact: true })
    .fill('A test prompt');
  await page
    .getByRole('textbox', { name: 'Message', exact: true })
    .press('Enter');
  expect(submitted).toBeUndefined();
  await page.getByRole('button', { name: 'Send ↑', exact: true }).click();
  await expect.poll(() => submitted?.modelId).toBe(modelId);
  await expect(
    page.getByRole('combobox', { name: 'Choose AI model' }),
  ).toHaveValue(modelId);
});

test('admin settings save and refresh the visible brand', async ({ page }) => {
  await mockApi(page, 'ADMIN');
  let name = 'Vrompt';
  await page.route('**/settings/public', (route) =>
    route.fulfill({ json: { 'branding.siteName': name } }),
  );
  await page.route('**/api/v1/admin/settings', (route) =>
    route.fulfill({
      json: [
        {
          key: 'branding.siteName',
          group: 'Branding',
          label: 'Site name',
          description: 'Public workspace name',
          type: 'string',
          value: name,
          defaultValue: 'Vrompt',
          maxLength: 40,
          updatedAt: name,
        },
      ],
    }),
  );
  await page.route('**/admin/settings/branding.siteName', async (route) => {
    name = route.request().postDataJSON().value;
    await route.fulfill({ json: { value: name } });
  });
  await page.goto('/admin/settings');
  await page.getByLabel('Site name', { exact: true }).fill('Studio AI');
  await page.getByRole('button', { name: 'Save change', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Settings saved.' }),
  ).toBeVisible();
  await expect(page.locator('.workspace-brand')).toContainText('Studio AI');
  await page.reload();
  await expect(page.getByLabel('Site name', { exact: true })).toHaveValue(
    'Studio AI',
  );
});

test('user accounts cannot open admin management views', async ({ page }) => {
  await mockApi(page);
  await page.goto('/admin/users');
  await expect(page.getByText('Administrator access required.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add admin' })).toHaveCount(0);
});

test('mobile layout fits and navigation supports Escape and focus return', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await page.goto('/chat');
  await expect(
    page.getByRole('heading', { name: 'Hello, Alex.' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const menu = page.getByRole('button', { name: 'Toggle navigation' });
  await menu.click();
  await expect(
    page.getByRole('navigation', { name: 'Workspace', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await page.screenshot({
    path: 'test-results/chat-mobile.png',
    fullPage: true,
  });
});

test('sign-in opens as a modal, traps focus, and restores the trigger on Escape', async ({
  page,
}) => {
  await mockApi(page, 'guest');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Sign in', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Welcome to Vrompt.' });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL('/');
  await expect(
    dialog.getByRole('button', { name: 'Continue with Google' }),
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Continue with GitHub' }),
  ).toBeVisible();
  for (let i = 0; i < 10; i++) await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() =>
      document.querySelector('dialog')?.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/login-modal-desktop.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test('direct login displays a responsive modal and a useful OAuth error', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page, 'guest');
  await page.goto('/login?error=google_not_configured');
  const dialog = page.getByRole('dialog', { name: 'Welcome to Vrompt.' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('alert')).toContainText('not configured');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/login-modal-mobile.png' });
  await dialog.getByRole('button', { name: 'Close sign-in' }).click();
  await expect(page).toHaveURL('/');
  await expect(dialog).not.toBeVisible();
});

test('sign-in remembers the originating workspace before OAuth redirect', async ({
  page,
}) => {
  await mockApi(page, 'guest');
  let origin = '';
  await page.route('**/api/v1/auth/google', async (route) => {
    await route.fulfill({
      status: 302,
      headers: { location: `${origin}/#handoff` },
    });
  });
  await page.goto('/projects');
  origin = new URL(page.url()).origin;
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL('/#handoff');
  expect(
    await page.evaluate(() => sessionStorage.getItem('vrompt-oauth-return-to')),
  ).toBe('/projects');
});

test('visitor signs in, sends with Auto, switches models, views usage, and opens test checkout', async ({
  page,
}) => {
  // OAuth, AI, and payment responses are explicit browser-test fixtures.
  let signedIn = false;
  await mockApi(page, () => (signedIn ? 'USER' : 'guest'));
  let origin = '';
  await page.route('**/api/v1/auth/google', async (route) => {
    signedIn = true;
    await route.fulfill({
      status: 302,
      headers: { location: `${origin}/auth/callback` },
    });
  });
  const submissions: Record<string, unknown>[] = [];
  const messages: {
    id: string;
    role: string;
    content: string;
    status: string;
  }[] = [];
  const trackedUsage = structuredClone(usage);
  await page.route('**/workspace/usage', (route) =>
    route.fulfill({ json: trackedUsage }),
  );
  await page.route(`**/conversations/${conversationId}`, (route) =>
    route.fulfill({
      json: {
        id: conversationId,
        title: 'Launch plan',
        messages,
        attachments: [],
      },
    }),
  );
  await page.route(
    `**/conversations/${conversationId}/messages`,
    async (route) => {
      const body = route.request().postDataJSON();
      submissions.push(body);
      messages.push({
        id: `user-${submissions.length}`,
        role: 'user',
        content: body.content,
        status: 'SUCCEEDED',
      });
      const response = {
        id: `reply-${submissions.length}`,
        role: 'assistant',
        content: `Fixture response ${submissions.length}`,
        status: 'SUCCEEDED',
      };
      messages.push(response);
      trackedUsage.credits.remaining--;
      const bucket = trackedUsage.allowances.find(
        (item) => item.bucket === (body.modelId ?? 'AUTO'),
      )!;
      bucket.dailyRemaining--;
      bucket.monthlyRemaining--;
      await route.fulfill({
        contentType: 'text/event-stream',
        body: [
          { type: 'model', model: model.displayName, mode: body.mode },
          { type: 'delta', text: response.content },
          {
            type: 'done',
            status: 'SUCCEEDED',
            messageId: response.id,
            usage: trackedUsage,
          },
        ]
          .map((event) => `data: ${JSON.stringify(event)}\n\n`)
          .join(''),
      });
    },
  );
  let checkout: Record<string, unknown> | undefined;
  await page.route('**/api/v1/billing/checkout', async (route) => {
    checkout = route.request().postDataJSON();
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    await route.fulfill({
      json: { checkoutUrl: 'https://checkout.paymongo.com/browser-fixture' },
    });
  });
  await page.route('https://checkout.paymongo.com/browser-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<h1>Test checkout fixture</h1>',
    }),
  );
  await page.goto('/');
  origin = new URL(page.url()).origin;
  await page
    .getByRole('textbox', { name: 'Your message' })
    .fill('Help me plan a launch');
  await page
    .getByRole('button', { name: 'Open chat with your message' })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL('/chat');
  const input = page.getByRole('textbox', { name: 'Message', exact: true });
  const selector = page.getByRole('combobox', { name: 'Choose AI model' });
  await expect(input).toHaveValue('Help me plan a launch');
  await expect(selector).toHaveValue('AUTO');
  await page.getByRole('button', { name: /^Send/ }).click();
  await expect(
    page.getByText('Fixture response 1', { exact: true }),
  ).toBeVisible();
  expect(submissions[0]?.mode).toBe('AUTO');
  expect(submissions[0]?.modelId).toBeUndefined();
  await selector.selectOption(modelId);
  await input.fill('Expand the plan');
  await page.getByRole('button', { name: /^Send/ }).click();
  await expect(
    page.getByText('Fixture response 2', { exact: true }),
  ).toBeVisible();
  expect(submissions[1]?.modelId).toBe(modelId);
  await page
    .getByRole('navigation', { name: 'Workspace', exact: true })
    .getByRole('link', { name: 'Usage' })
    .click();
  await expect(
    page.getByText('98 / 100 monthly credits remaining'),
  ).toBeVisible();
  await page.getByRole('link', { name: 'About Vrompt' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Pricing' })
    .click();
  await page.getByRole('button', { name: 'Get Vrompt Pro' }).click();
  await expect(page).toHaveURL('/billing?plan=PRO');
  await expect(
    page.getByText('Test payment mode. Checkout will not make a real charge.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Get Vrompt Pro' }).click();
  await expect(page).toHaveURL('https://checkout.paymongo.com/browser-fixture');
  expect(checkout?.planCode).toBe('PRO');
});

test('missing provider and payment credentials have useful states and cannot submit', async ({
  page,
}) => {
  await mockApi(page);
  await page.route('**/catalog/models', (route) =>
    route.fulfill({ json: [{ ...model, available: false }] }),
  );
  await page.route('**/workspace/models', (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route('**/billing/plans', (route) =>
    route.fulfill({ json: { ...plans, checkoutAvailable: false } }),
  );
  await page.goto('/chat');
  await expect(
    page.getByText('AI chat is temporarily unavailable.', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Message', exact: true })
    .fill('Keep my draft');
  await expect(page.getByRole('button', { name: /^Send/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Check availability' }).click();
  await expect(
    page.getByRole('textbox', { name: 'Message', exact: true }),
  ).toHaveValue('Keep my draft');
  await page.goto('/billing?plan=PRO');
  await expect(
    page.getByText('Paid checkout is temporarily unavailable.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Checkout unavailable' }),
  ).toBeDisabled();
  await page.getByRole('link', { name: 'Continue to chat' }).click();
  await expect(page).toHaveURL('/chat');
});

test('landing sections, model handoff, and responsive navigation are complete', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page.locator('#hero-title')).toHaveText(
    'One account.One subscription.Multiple AI models.',
  );
  await expect(page.locator('main > section')).toHaveCount(7);
  const ids = await page
    .locator('main > section')
    .evaluateAll((sections) => sections.map((section) => section.id));
  expect(ids.slice(2, 6)).toEqual([
    'why-vrompt',
    'how-auto-works',
    'models',
    'pricing',
  ]);
  await page.screenshot({
    path: 'test-results/landing-desktop.png',
    fullPage: true,
  });
  for (const width of [390, 320, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    for (const name of ['Why Vrompt', 'Models', 'Pricing']) {
      await nav.getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL(
        new RegExp(
          `#${name === 'Why Vrompt' ? 'why-vrompt' : name.toLowerCase()}$`,
        ),
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'test-results/landing-mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Explore in chat' }).click();
  await expect(page).toHaveURL(`/chat?model=${modelId}`);
  await expect(
    page.getByRole('combobox', { name: 'Choose AI model' }),
  ).toHaveValue(modelId);
});

test('old marketing URLs redirect to the matching section', async ({
  page,
}) => {
  await mockApi(page, 'guest');
  for (const [path, hash] of [
    ['/features', 'why-vrompt'],
    ['/auto', 'how-auto-works'],
    ['/models', 'models'],
    ['/pricing', 'pricing'],
  ]) {
    await page.goto(path!);
    await expect(page).toHaveURL(`/#${hash}`);
    await expect(page.locator(`#${hash}`)).toBeVisible();
  }
});

test('a saved session cookie does not hide landing pricing or legal pages', async ({
  page,
  context,
}) => {
  await mockApi(page, 'guest');
  await page.goto('/');
  await context.addCookies([
    {
      name: 'vrompt_refresh_token',
      value: 'expired-cookie-fixture',
      url: new URL(page.url()).origin,
      httpOnly: true,
    },
  ]);
  await page.goto('/#pricing');
  await expect(page).toHaveURL('/#pricing');
  await expect(page.locator('#pricing-title')).toBeVisible();
  for (const path of ['/privacy', '/terms', '/docs']) {
    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('main section').first()).toBeVisible();
  }
});

test('every New Chat starts with Auto and clears drafts despite a legacy default', async ({
  page,
}) => {
  await mockApi(page);
  await page.route('**/workspace/preferences', (route) =>
    route.fulfill({
      json: { displayName: 'Alex', defaultModelId: modelId, sendOnEnter: true },
    }),
  );
  await page.goto('/chat');
  const picker = page.getByRole('combobox', { name: 'Choose AI model' });
  const composer = page.getByRole('textbox', { name: 'Message', exact: true });
  await expect(picker).toHaveValue('AUTO');
  await expect(
    page.getByRole('heading', { name: 'Hello, Alex.' }),
  ).toBeVisible();
  await picker.selectOption(modelId);
  await composer.fill('Draft to discard');
  await page.getByRole('link', { name: 'New Chat', exact: true }).click();
  await expect(picker).toHaveValue('AUTO');
  await expect(composer).toHaveValue('');
  await composer.fill('Another draft');
  await page.getByRole('link', { name: 'New Chat', exact: true }).click();
  await expect(composer).toHaveValue('');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(
    page.getByRole('link', { name: 'Manage subscription' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('link', { name: 'Manage subscription' }),
  ).toBeHidden();
  await expect(page.locator('.workspace-brand')).toHaveAttribute('href', '/');
  await page.screenshot({
    path: 'test-results/chat-desktop.png',
    fullPage: true,
  });
});

test('failed empty responses can be retried and Enter uses Auto once', async ({
  page,
}) => {
  await mockApi(page);
  await page.route('**/workspace/preferences', (route) =>
    route.fulfill({
      json: { displayName: 'Alex', defaultModelId: null, sendOnEnter: true },
    }),
  );
  const failed = {
    id: 'failed-response',
    role: 'assistant',
    content: '',
    status: 'FAILED',
    modelName: 'Configured model',
  };
  await page.route('**/workspace/conversations/' + conversationId, (route) =>
    route.fulfill({
      json: {
        id: conversationId,
        title: 'Retry conversation',
        attachments: [],
        messages: [
          {
            id: 'original-prompt',
            role: 'user',
            content: 'Help me write',
            status: 'SUCCEEDED',
          },
          failed,
        ],
      },
    }),
  );
  const requests: Record<string, unknown>[] = [];
  await page.route(
    '**/conversations/' + conversationId + '/messages',
    async (route) => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({
        contentType: 'text/event-stream',
        body:
          'data: ' +
          JSON.stringify({
            type: 'done',
            status: 'SUCCEEDED',
            messageId: 'retry-result',
            usage,
          }) +
          '\n\n',
      });
    },
  );
  await page.goto('/chat?id=' + conversationId);
  await page.getByRole('button', { name: 'Retry response' }).click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toMatchObject({
    mode: 'AUTO',
    regenerateMessageId: 'failed-response',
  });
  const composer = page.getByRole('textbox', { name: 'Message', exact: true });
  await expect(composer).toBeEnabled();
  await composer.fill('Next prompt');
  await composer.press('Shift+Enter');
  expect(requests).toHaveLength(1);
  await composer.press('Enter');
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]).toMatchObject({ mode: 'AUTO', content: 'Next prompt' });
});
