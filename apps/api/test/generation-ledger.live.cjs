/* Isolated database integration test. Only the provider transport is a fixture. */
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { ChatService } = require('../dist/modules/workspace/chat.service');
const { QuotaService } = require('../dist/modules/workspace/quota.service');
const { ModelRegistryService } = require('../dist/modules/workspace/registry.service');
const { ProviderFailure } = require('../dist/modules/workspace/providers');

const database = new URL(process.env.DATABASE_URL || 'http://invalid');
assert(process.env.GENERATION_REVIEW === 'true' && process.env.NODE_ENV !== 'production'
  && ['localhost', '127.0.0.1', 'vrompt-postgres'].includes(database.hostname), 'Explicit local review required');
database.pathname = '/vrompt_mvp_review_20260906';
const prisma = new PrismaClient({ datasources: { db: { url: database.href } } });
let fail = false;
let calls = 0;
let latestMessages;
const providers = { get: (provider) => ({
  available: () => provider === 'GROQ',
  stream: async (_model, messages, _files, _maxOutput, _signal, delta, usage) => {
    calls++;
    latestMessages = messages;
    if (fail) throw new ProviderFailure('HTTP_503');
    delta('Isolated provider fixture response.');
    Object.assign(usage, { input: 20, output: 10, cached: 0, reasoning: 0,
      reported: true, raw: { prompt_tokens: 20, completion_tokens: 10 } });
  },
}) };

async function main() {
  const suffix = randomUUID();
  const user = await prisma.user.create({ data: { email: `${suffix}@integration.invalid`, username: `ledger-${suffix.slice(0, 12)}` } });
  const conversation = await prisma.conversation.create({ data: { userId: user.id, title: 'Isolated ledger review' } });
  const quota = new QuotaService(prisma);
  const registry = new ModelRegistryService(prisma, providers);
  const chat = new ChatService(prisma, quota, registry, providers, { forConversation: async () => [] });
  const groq = (await chat.models(user.id))[0];
  assert.equal(groq.provider, 'GROQ', 'only configured plan-allowed models are selectable');
  const before = await quota.usage(user.id);
  const events = [];
  const request = { requestId: randomUUID(), mode: 'AUTO', content: 'Write a short welcome.' };
  const run = (input) => chat.generate(user.id, conversation.id, input, new AbortController().signal, (event) => events.push(event));
  await run({ ...request });
  assert.equal(events.at(-1).status, 'SUCCEEDED');
  const record = await prisma.usageRecord.findFirstOrThrow({ where: { requestId: request.requestId } });
  assert.equal(record.provider, 'GROQ');
  assert.equal(record.modelId, groq.id);
  assert.equal(record.originalModelId, groq.id);
  assert.equal(record.inputTokens, 20);
  assert.equal(record.outputTokens, 10);
  assert.equal(Number(record.estimatedCost), 0.0000045);
  assert.equal(record.costEstimated, false);
  assert.equal((await quota.usage(user.id)).credits.remaining, before.credits.remaining - 1);
  const reservation = await prisma.quotaReservation.findUniqueOrThrow({ where: { id: request.requestId } });
  assert.equal(reservation.creditUnits, 1);
  const previousCalls = calls;
  await assert.rejects(run({ ...request }), /already been submitted/);
  assert.equal(calls, previousCalls, 'duplicate requests never reach the provider');
  assert.equal(await prisma.usageRecord.count({ where: { requestId: request.requestId } }), 1);
  await run({ requestId: randomUUID(), mode: 'MANUAL', modelId: groq.id, content: 'Continue the welcome.' });
  assert(latestMessages.some((message) => message.role === 'assistant' && message.content.includes('fixture response')));
  assert.equal(events.at(-1).status, 'SUCCEEDED');
  const failedId = randomUUID();
  fail = true;
  const beforeFailure = (await quota.usage(user.id)).credits.remaining;
  await run({ requestId: failedId, mode: 'AUTO', content: 'Original failed prompt' });
  assert.equal(events.at(-1).status, 'FAILED');
  assert.equal((await quota.usage(user.id)).credits.remaining, beforeFailure);
  const failed = await prisma.message.findUniqueOrThrow({ where: { generationId: failedId } });
  fail = false;
  await run({ requestId: randomUUID(), mode: 'AUTO', content: 'Regenerate', regenerateMessageId: failed.id });
  assert.equal(latestMessages.at(-1).content, 'Original failed prompt');
  assert.equal(events.at(-1).status, 'SUCCEEDED');
  const policy = (await quota.policies(user.id)).policies.find((entry) => entry.bucket === 'AUTO');
  const contenders = [randomUUID(), randomUUID()];
  const results = await Promise.allSettled(contenders.map((id) => quota.reserve(user.id, id, id, policy, 1)));
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1, 'row lock prevents concurrent allowance bypass');
  const reserved = contenders[results.findIndex((result) => result.status === 'fulfilled')];
  await prisma.$transaction((tx) => quota.finalizeIn(tx, reserved, 'FAILED', false));
  await assert.rejects(chat.owned(randomUUID(), conversation.id), /not found/);
  await assert.rejects(prisma.usageRecord.updateMany({ where: { id: record.id }, data: { inputTokens: 0 } }));
  console.log('PASS: configured models, Auto, manual continuation, token/cost/credit ledger, duplicate protection, failed retry/refund, concurrent reservation, ownership, immutable accounting.');
}
main().catch((error) => {
  // Error objects can include connection strings or request data: report category only.
  console.error(`FAIL: isolated ledger review (${error.name || 'Error'}).`);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
