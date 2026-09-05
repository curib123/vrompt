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
  allowances: [
    {
      bucket: 'AUTO',
      dailyLimit: 20,
      dailyRemaining: 20,
      monthlyLimit: 100,
      monthlyRemaining: 100,
      maxFiles: 0,
      allowedFeatures: ['chat'],
    },
    {
      bucket: modelId,
      dailyLimit: 20,
      dailyRemaining: 20,
      monthlyLimit: 100,
      monthlyRemaining: 100,
      maxFiles: 0,
      allowedFeatures: ['chat'],
    },
  ],
  resets: { daily: '2026-09-06T00:00:00Z', monthly: '2026-10-01T00:00:00Z' },
};

async function mockApi(page: Page, role: 'USER' | 'ADMIN' | 'guest' = 'USER') {
  await page.route('**/api/v1/**', async (route) => {
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

test('landing reflects the catalog and carries a draft into guest chat', async ({
  page,
}) => {
  await mockApi(page, 'guest');
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
  await page.route('**/api/v1/auth/google', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<p>OAuth provider handoff test</p>',
    }),
  );
  await page.goto('/projects');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/api\/v1\/auth\/google$/);
  expect(
    await page.evaluate(() => sessionStorage.getItem('vrompt-oauth-return-to')),
  ).toBe('/projects');
});
