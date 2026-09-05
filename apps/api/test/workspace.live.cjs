/* Explicitly opt-in integration checks against an isolated, migrated local database. */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { JwtService } = require('@nestjs/jwt');

const database = new URL(process.env.DATABASE_URL || 'http://invalid');
assert(
  ['localhost', '127.0.0.1'].includes(database.hostname) &&
    database.pathname === '/vrompt_review',
  'Use an isolated local vrompt_review database.',
);
assert(
  process.env.REVIEW_ADMIN_EMAIL &&
    process.env.REVIEW_ADMIN_PASSWORD &&
    process.env.JWT_ACCESS_SECRET,
  'Supply explicit review credentials.',
);
const base = 'http://localhost:4000/api/v1';
const prisma = new PrismaClient();
const jwt = new JwtService({ secret: process.env.JWT_ACCESS_SECRET });
let checks = 0;
async function request(
  path,
  { token, method = 'GET', body, status = 200 } = {},
) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  assert.equal(
    response.status,
    status,
    `${method} ${path}: ${JSON.stringify(result)}`,
  );
  checks++;
  return result;
}
async function main() {
  const session = await request('/auth/staff/login', {
    method: 'POST',
    status: 201,
    body: {
      email: process.env.REVIEW_ADMIN_EMAIL,
      password: process.env.REVIEW_ADMIN_PASSWORD,
    },
  });
  const admin = session.accessToken;
  const suffix = randomUUID().slice(0, 8);
  const owner = await prisma.user.create({
    data: {
      email: `owner-${suffix}@example.com`,
      username: `owner-${suffix}`,
      role: 'USER',
      onboardingCompleted: true,
    },
  });
  const other = await prisma.user.create({
    data: {
      email: `other-${suffix}@example.com`,
      username: `other-${suffix}`,
      role: 'USER',
      onboardingCompleted: true,
    },
  });
  const token = jwt.sign({ sub: owner.id }, { expiresIn: '5m' });
  const otherToken = jwt.sign({ sub: other.id }, { expiresIn: '5m' });
  await request('/admin/workspace/configuration', { status: 401 });
  await request('/admin/workspace/configuration', { token, status: 403 });
  await request('/admin/workspace/models', {
    token,
    method: 'POST',
    body: {},
    status: 403,
  });
  await request('/admin/settings', { token, status: 403 });
  await request('/workspace/conversations', { token: admin, status: 403 });
  await request('/admin/settings/branding.siteName', {
    token: admin,
    method: 'PATCH',
    body: { value: 'Review Workspace' },
  });
  const settings = await request('/settings/public');
  assert.equal(settings['branding.siteName'], 'Review Workspace');
  assert(!Object.hasOwn(settings, 'billing.proPriceCentavos'));
  await request('/admin/settings/constructor', {
    token: admin,
    method: 'PATCH',
    body: { value: 'invalid' },
    status: 404,
  });
  await request('/admin/settings/billing.proPriceCentavos', {
    token: admin,
    method: 'PATCH',
    body: { value: 1.5 },
    status: 400,
  });
  await request('/admin/settings/branding.siteName', {
    token: admin,
    method: 'DELETE',
  });
  const prefs = {
    displayName: 'Review User',
    defaultModelId: null,
    sendOnEnter: false,
  };
  await request('/workspace/preferences', {
    token,
    method: 'PATCH',
    body: prefs,
  });
  assert.deepEqual(await request('/workspace/preferences', { token }), prefs);
  assert.notEqual(
    (await request('/workspace/preferences', { token: otherToken }))
      .displayName,
    prefs.displayName,
  );
  await request('/workspace/preferences', {
    token,
    method: 'PATCH',
    body: { ...prefs, userId: other.id },
    status: 400,
  });
  const conversation = await request('/workspace/conversations', {
    token,
    method: 'POST',
    body: { title: 'Integration conversation' },
    status: 201,
  });
  await request(`/workspace/conversations/${conversation.id}`, {
    token: otherToken,
    status: 404,
  });
  await request(`/workspace/conversations/${conversation.id}`, {
    token: otherToken,
    method: 'PATCH',
    body: { title: 'Not allowed' },
    status: 404,
  });
  await request(`/workspace/conversations/${conversation.id}`, {
    token,
    method: 'PATCH',
    body: { title: 'Renamed conversation' },
  });
  assert.equal(
    (await request(`/workspace/conversations/${conversation.id}`, { token }))
      .title,
    'Renamed conversation',
  );
  const prompt = await request('/workspace/saved-prompts', {
    token,
    method: 'POST',
    body: { title: 'Reusable', content: 'Keep the result concise.' },
    status: 201,
  });
  assert(
    (await request('/workspace/saved-prompts', { token })).some(
      (item) => item.id === prompt.id,
    ),
  );
  await request(`/workspace/saved-prompts/${prompt.id}`, {
    token,
    method: 'DELETE',
  });
  await request(`/workspace/conversations/${conversation.id}`, {
    token,
    method: 'DELETE',
  });
  const config = await request('/admin/workspace/configuration', {
    token: admin,
  });
  assert(config.models.length > 0 && config.plans.length > 0);
  assert.deepEqual(await request('/catalog/models'), []); // Providers intentionally unconfigured in this test.
  const audits = await request('/admin/audit', { token: admin });
  assert(audits.items.some((event) => event.action === 'SETTING_UPDATED'));
  await request('/admin/billing/payments', { token: admin });
  await request('/admin/billing/overview', { token: admin });
  await request(`/admin/users/${session.user.id}`, {
    token: admin,
    method: 'PATCH',
    body: { status: 'SUSPENDED' },
    status: 403,
  });
  await request(`/admin/users/${owner.id}`, {
    token: admin,
    method: 'PATCH',
    body: { status: 'SUSPENDED' },
  });
  await request('/workspace/preferences', { token, status: 401 });
  console.log(
    `${checks} live API checks passed: access control, ownership, settings, preferences, conversations, prompts, billing, and audit history.`,
  );
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
