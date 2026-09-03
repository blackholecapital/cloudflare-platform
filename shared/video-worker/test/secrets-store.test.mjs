import assert from 'node:assert/strict';
import test from 'node:test';

import worker, { apiHeaderValue, bindingValue } from '../src/index.js';

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

test('apiHeaderValue removes clipboard characters invalid in HTTP headers', () => {
  assert.equal(apiHeaderValue(' sk-live\u200b-token\r\n'), 'sk-live-token');
});

test('apiHeaderValue rejects a value with no visible ASCII token', () => {
  assert.throws(() => apiHeaderValue('\u200b\r\n'), /API key is required/);
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

test('tenant readiness proves the capability token without creating a LiveKit room', async () => {
  const secret = (value) => ({ get: async () => value });
  const response = await worker.fetch(new Request('https://video.example/internal/tenant/readiness?tenant=ai-fans', {
    headers: { 'x-blackhole-capability-token': 'shared-capability' },
  }), {
    BLACKHOLE_CAPABILITY_TOKEN: secret('shared-capability'),
    LIVEKIT_URL: 'wss://example.livekit.cloud',
    LIVEKIT_API_KEY: secret('api-key'),
    LIVEKIT_API_SECRET: secret('api-secret'),
    VIDEO_AGENT_NAME: 'blackhole-avatar',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    service: 'blackhole-video-worker',
    tenantId: 'ai-fans',
    capabilityAuthorized: true,
    livekitConfigured: true,
    agentName: 'blackhole-avatar',
  });
});

test('tenant readiness rejects a drifted capability token', async () => {
  const response = await worker.fetch(new Request('https://video.example/internal/tenant/readiness?tenant=ai-fans', {
    headers: { 'x-blackhole-capability-token': 'wrong-capability' },
  }), {
    BLACKHOLE_CAPABILITY_TOKEN: { get: async () => 'shared-capability' },
  });

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.capabilityAuthorized, false);
  assert.equal(body.error, 'Unauthorized');
});

