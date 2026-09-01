import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

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

test('shared broker declares Buddy tenant secrets', () => {
  const config = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
  assert.match(config, /binding = "BLACKHOLE_BUDDYS_CAPABILITY_TOKEN"\s+store_id = "00b34d29f2c94685b0f250dc5b1ee875"\s+secret_name = "BUDDYS_VIDEO_CAPABILITY_TOKEN"/);
  assert.match(config, /binding = "LEMONSLICE_BUDDYS_API_KEY"\s+store_id = "00b34d29f2c94685b0f250dc5b1ee875"\s+secret_name = "XYZ_DEMO_LEMONSLICE_API_KEY"/);
});
