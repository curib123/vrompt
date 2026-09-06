/* Opt-in local security regression checks. Creates and removes only its own accounts. */
const assert = require('node:assert/strict');
const {
  randomUUID,
  randomBytes,
  scryptSync,
  createHash,
} = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { JwtService } = require('@nestjs/jwt');
const database = new URL(process.env.DATABASE_URL || 'http://invalid');
assert(
  process.env.AUTH_REVIEW === 'true' &&
    process.env.NODE_ENV !== 'production' &&
    ['localhost', '127.0.0.1', 'vrompt-postgres'].includes(database.hostname),
  'Explicit local review required',
);
const prisma = new PrismaClient();
const jwt = new JwtService({
  secret: process.env.JWT_ACCESS_SECRET,
  signOptions: {
    issuer: 'vrompt-api',
    audience: 'vrompt-web',
    algorithm: 'HS256',
    expiresIn: 900,
  },
});
const base = process.env.AUTH_REVIEW_API_URL || 'http://localhost:4000/api/v1';
const created = [];
const suffix = randomUUID().slice(0, 8);
let checks = 0;
async function request(
  path,
  { token, cookie, body, method = 'GET', status = 200, headers = {} } = {},
) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'X-Vrompt-Client': 'web',
      Origin: process.env.WEB_ORIGIN,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.equal(res.status, status, `${method} ${path}`);
  checks++;
  return {
    body: await res.json(),
    cookie: res.headers.get('set-cookie')?.split(';')[0],
    cache: res.headers.get('cache-control'),
  };
}
async function account(label, role = 'USER') {
  const user = await prisma.user.create({
    data: {
      email: `${label}-${suffix}@auth-review.invalid`,
      username: `${label}-${suffix}`,
      role,
    },
  });
  created.push(user.id);
  return user;
}
async function credential(user, password) {
  const salt = randomBytes(16).toString('hex');
  const passwordHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
  await prisma.staffCredential.create({
    data: { userId: user.id, passwordHash },
  });
}
async function session(user) {
  const refresh = randomBytes(48).toString('base64url');
  const row = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: createHash('sha256').update(refresh).digest('hex'),
      expiresAt: new Date(Date.now() + 600000),
    },
  });
  return {
    token: await jwt.signAsync({
      sub: user.id,
      sid: row.familyId,
      role: user.role,
    }),
    cookie: `vrompt_refresh_token=${refresh}`,
    familyId: row.familyId,
  };
}
async function main() {
  const admin = await account('admin', 'ADMIN');
  const owner = await account('owner');
  const other = await account('other');
  const password = randomBytes(24).toString('base64url');
  await credential(admin, password);
  const login = await request('/auth/staff/login', {
    method: 'POST',
    status: 201,
    body: { email: admin.email, password },
  });
  assert.equal(login.cache, 'no-store');
  checks++;
  const token = login.body.accessToken;
  const originalClaims = jwt.decode(token);
  assert(
    originalClaims.sid &&
      originalClaims.iss === 'vrompt-api' &&
      originalClaims.aud === 'vrompt-web',
  );
  checks++;
  await request('/admin/dashboard', { token });
  const rotated = await request('/auth/refresh', {
    method: 'POST',
    cookie: login.cookie,
    status: 201,
  });
  assert.equal(jwt.decode(rotated.body.accessToken).sid, originalClaims.sid);
  checks++;
  await request('/admin/dashboard', { token }); // Other tabs keep their valid access token.
  await request('/auth/refresh', {
    method: 'POST',
    cookie: login.cookie,
    status: 401,
  });
  await request('/admin/dashboard', {
    token: rotated.body.accessToken,
    status: 401,
  });
  await request('/auth/refresh', {
    method: 'POST',
    cookie: rotated.cookie,
    status: 401,
  });

  const a = await session(admin),
    u = await session(owner),
    v = await session(other);
  await request('/auth/me', { token: u.token });
  await request('/admin/dashboard', { token: u.token, status: 403 });
  await request('/admin/workspace/configuration', {
    token: u.token,
    status: 403,
  });
  await request('/workspace/conversations', { token: a.token, status: 403 });
  await request('/workspace/conversations', { status: 401 });
  await request('/auth/staff/password', {
    method: 'POST',
    token: u.token,
    body: { currentPassword: password, newPassword: password },
    status: 403,
  });
  for (const path of ['/auth/refresh', '/auth/logout', '/auth/staff/login']) {
    await request(path, {
      method: 'POST',
      cookie: u.cookie,
      headers: { Origin: 'https://attacker.invalid' },
      status: 403,
    });
    await request(path, {
      method: 'POST',
      cookie: u.cookie,
      headers: { 'X-Vrompt-Client': '' },
      status: 403,
    });
  }
  const conv = await request('/workspace/conversations', {
    method: 'POST',
    token: u.token,
    status: 201,
    body: { title: 'Private review' },
  });
  const catalog = await request('/catalog/models');
  if (!catalog.body.some((model) => model.available)) {
    const before = await request('/workspace/usage', { token: u.token });
    await request(`/workspace/conversations/${conv.body.id}/messages`, {
      method: 'POST',
      token: u.token,
      status: 503,
      body: {
        requestId: randomUUID(),
        content: 'Offline availability check',
        mode: 'AUTO',
        feature: 'chat',
        attachmentIds: [],
      },
    });
    const after = await request('/workspace/usage', { token: u.token });
    assert.deepEqual(
      after.body,
      before.body,
      'Unavailable providers must not consume usage',
    );
    assert.equal(
      await prisma.message.count({ where: { conversationId: conv.body.id } }),
      0,
    );
    checks += 2;
  }
  await request(`/workspace/conversations/${conv.body.id}`, {
    token: v.token,
    status: 404,
  });
  await request(`/workspace/conversations/${conv.body.id}`, {
    method: 'DELETE',
    token: v.token,
    status: 404,
  });
  const prompt = await request('/workspace/saved-prompts', {
    method: 'POST',
    token: u.token,
    status: 201,
    body: { title: 'Private', content: 'Owner only' },
  });
  const changed = await request(`/workspace/saved-prompts/${prompt.body.id}`, {
    method: 'PATCH',
    token: v.token,
    body: { title: 'Attack', content: 'Attack' },
  });
  assert.equal(changed.body.count, 0);
  checks++;
  assert.equal(
    (await prisma.savedPrompt.findUnique({ where: { id: prompt.body.id } }))
      .content,
    'Owner only',
  );
  checks++;

  await request('/auth/logout', {
    method: 'POST',
    cookie: u.cookie,
    status: 201,
  });
  await request('/auth/me', { token: u.token, status: 401 });
  await request('/auth/refresh', {
    method: 'POST',
    cookie: u.cookie,
    status: 401,
  });

  const suspended = await session(owner);
  await request(`/admin/users/${owner.id}`, {
    token: a.token,
    method: 'PATCH',
    body: { status: 'SUSPENDED' },
  });
  await request('/auth/me', { token: suspended.token, status: 401 });
  await request(`/admin/users/${owner.id}`, {
    token: a.token,
    method: 'PATCH',
    body: { status: 'ACTIVE' },
  });
  await request('/auth/me', { token: suspended.token, status: 401 });
  await request(`/admin/users/${owner.id}`, {
    token: a.token,
    method: 'PATCH',
    body: { role: 'ADMIN' },
    status: 400,
  });
  const beforePromotion = await session(owner);
  await request(`/admin/users/${owner.id}`, {
    token: a.token,
    method: 'PATCH',
    body: { role: 'ADMIN', password },
  });
  await request('/admin/dashboard', {
    token: beforePromotion.token,
    status: 401,
  });
  const promoted = await request('/auth/staff/login', {
    method: 'POST',
    status: 201,
    body: { email: owner.email, password },
  });
  await request('/admin/dashboard', { token: promoted.body.accessToken });
  const nextPassword = randomBytes(24).toString('base64url');
  await request(`/admin/users/${owner.id}`, {
    token: a.token,
    method: 'PATCH',
    body: { password: nextPassword },
  });
  await request('/admin/dashboard', {
    token: promoted.body.accessToken,
    status: 401,
  });
  await request('/auth/staff/login', {
    method: 'POST',
    status: 401,
    body: { email: owner.email, password },
  });
  const reset = await request('/auth/staff/login', {
    method: 'POST',
    status: 201,
    body: { email: owner.email, password: nextPassword },
  });
  await request(`/admin/users/${owner.id}`, {
    token: a.token,
    method: 'PATCH',
    body: { role: 'USER' },
  });
  await request('/admin/dashboard', {
    token: reset.body.accessToken,
    status: 401,
  });
  await request(`/admin/users/${admin.id}`, {
    token: a.token,
    method: 'PATCH',
    body: { role: 'USER' },
    status: 403,
  });
  await request(`/admin/users/${admin.id}`, {
    token: a.token,
    method: 'PATCH',
    body: { password: nextPassword },
    status: 403,
  });
  await request('/auth/staff/password', {
    token: a.token,
    method: 'POST',
    status: 201,
    body: { currentPassword: password, newPassword: nextPassword },
  });
  await request('/admin/dashboard', { token: a.token, status: 401 });
  const invalid = await jwt.signAsync(
    { sub: other.id, sid: v.familyId, role: 'USER' },
    { audience: 'wrong-app' },
  );
  await request('/auth/me', { token: invalid, status: 401 });
  const legacy = await jwt.signAsync({ sub: other.id, role: 'USER' });
  await request('/auth/me', { token: legacy, status: 401 });
  console.log(`${checks} live authentication and authorization checks passed.`);
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.auditLog.deleteMany({ where: { actorId: { in: created } } });
    await prisma.user.deleteMany({ where: { id: { in: created } } });
    await prisma.$disconnect();
  });
