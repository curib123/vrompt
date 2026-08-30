import assert from 'node:assert/strict';
import test from 'node:test';

import { APP_NAME, createHealthStamp } from './index';

test('createHealthStamp returns a typed health object', () => {
  const health = createHealthStamp('api');

  assert.equal(APP_NAME, 'Vrompt');
  assert.equal(health.status, 'ok');
  assert.equal(health.service, 'api');
});
