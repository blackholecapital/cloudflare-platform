import assert from 'node:assert/strict';
import test from 'node:test';

import worker, { bindingValue } from '../src/index.js';

test('bindingValue supports legacy Worker secrets', async () => {
  assert.equal(await bindingValue('  legacy-secret  '), 'legacy-secret');
});

test('bindingValue resolves Cloudflare Secrets Store bindings', async () => {
  let calls = 0;
  const binding = {
    async get() {
      calls += 1;
      return '  centralized-secret  ';
    },
  };

  assert.equal(await bindingValue(binding), 'centralized-secret');
  assert.equal(calls, 1);
});

test('health validates resolved LiveKit secret values', async () => {
  const secret = (value) => ({ get: async () => value });
  const response = await worker.fetch(new Request('https://video.example/health'), {
    LIVEKIT_URL: 'wss://example.livekit.cloud',
    LIVEKIT_API_KEY: secret('api-key'),
    LIVEKIT_API_SECRET: secret('api-secret'),
    VIDEO_AGENT_NAME: 'blackhole-avatar',
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).livekitConfigured, true);
});

test('health reports an unreadable Secrets Store binding as unconfigured', async () => {
  const response = await worker.fetch(new Request('https://video.example/health'), {
    LIVEKIT_URL: 'wss://example.livekit.cloud',
    LIVEKIT_API_KEY: { get: async () => { throw new Error('unavailable'); } },
    LIVEKIT_API_SECRET: { get: async () => 'api-secret' },
    VIDEO_AGENT_NAME: 'blackhole-avatar',
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).livekitConfigured, false);
});
