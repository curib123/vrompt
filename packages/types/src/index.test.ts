import assert from 'node:assert/strict';
import test from 'node:test';

import type { AppHealth } from './index';

test('AppHealth allows web and api services', () => {
  const health: AppHealth = {
    status: 'ok',
    service: 'web',
    timestamp: new Date().toISOString(),
  };

  assert.equal(health.service, 'web');
});
