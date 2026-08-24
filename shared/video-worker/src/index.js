import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk';

const RELAY_TTL_SECONDS = 600;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  },
});

const cleanId = (value, max = 96) => String(value || '')
  .replace(/[^a-zA-Z0-9_-]/g, '')
  .slice(0, max);

const required = (value, name, max = 5000) => {
  const out = String(value || '').trim().slice(0, max);
  if (!out) throw new Error(`${name} is required`);
  return out;
};

const tenantSecretSlot = (tenantId) => tenantId
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

function capabilitySecret(env) {
  return required(env.BLACKHOLE_CAPABILITY_TOKEN, 'BLACKHOLE_CAPABILITY_TOKEN', 500);
}

function liveKitConfig(env) {
  const apiKey = required(env.LIVEKIT_API_KEY, 'LIVEKIT_API_KEY', 500);
  const apiSecret = required(env.LIVEKIT_API_SECRET, 'LIVEKIT_API_SECRET', 1000);
  const agentName = required(env.VIDEO_AGENT_NAME, 'VIDEO_AGENT_NAME', 160);
  const wsUrl = required(env.LIVEKIT_URL, 'LIVEKIT_URL', 1000);
  const httpUrl = new URL(wsUrl);
  if (httpUrl.protocol === 'wss:') httpUrl.protocol = 'https:';
  else if (httpUrl.protocol === 'ws:') httpUrl.protocol = 'http:';
  if (!['https:', 'http:'].includes(httpUrl.protocol)) throw new Error('LIVEKIT_URL must use ws(s) or http(s)');
  return { apiKey, apiSecret, agentName, wsUrl, httpUrl: httpUrl.origin };
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function relayToken(env, tenantId, room) {
  const exp = Math.floor(Date.now() / 1000) + RELAY_TTL_SECONDS;
  const sig = await hmac(capabilitySecret(env), `${tenantId}|${room}|${exp}`);
  return `bh1.${exp}.${sig}`;
}

async function authorizeRelay(request, env, tenantId, room) {
  const token = String(request.headers.get('x-api-key') || '').trim();
  const [version, expRaw, signature] = token.split('.');
  const exp = Number(expRaw);
  const now = Math.floor(Date.now() / 1000);

  if (version !== 'bh1' || !Number.isInteger(exp) || exp < now || exp > now + RELAY_TTL_SECONDS + 60 || !signature) {
    return false;
  }

  const expected = await hmac(capabilitySecret(env), `${tenantId}|${room}|${exp}`);
  return signature === expected;
}

function normalizeSession(body = {}) {
  const tenantId = cleanId(body.tenantId || body.tenant_id, 64);
  const creatorId = cleanId(body.creatorId || body.creator_id, 64);
  const fanId = cleanId(body.fanId || body.fan_id || crypto.randomUUID(), 96) || crypto.randomUUID();
  const avatarProvider = required(body.avatarProvider || body.avatar_provider, 'avatarProvider', 64).toLowerCase();
  const avatarSource = required(body.avatarSource || body.avatar_source, 'avatarSource', 64).toLowerCase();
  const voiceProvider = required(body.voiceProvider || body.voice_provider, 'voiceProvider', 64).toLowerCase();
  const voiceModel = String(body.voiceModel || body.voice_model || '').trim().slice(0, 160);
  const voiceId = required(body.voiceId || body.voice_id, 'voiceId', 160);
  const instructions = required(body.instructions, 'instructions');
  const agentId = String(body.lemonsliceAgentId || body.lemonslice_agent_id || '').trim().slice(0, 240);
  const imageUrl = String(body.avatarImageUrl || body.avatar_image_url || '').trim().slice(0, 2000);
  const avatarPrompt = String(body.avatarPrompt || body.avatar_prompt || '').trim().slice(0, 500);
  const avatarIdlePrompt = String(body.avatarIdlePrompt || body.avatar_idle_prompt || '').trim().slice(0, 500);

  if (!tenantId) throw new Error('tenantId is required');
  if (!creatorId) throw new Error('creatorId is required');
  if (avatarProvider !== 'lemonslice') throw new Error('avatarProvider must be lemonslice');
  if (!['agent-id', 'image-url'].includes(avatarSource)) throw new Error('avatarSource must be agent-id or image-url');
  if (avatarSource === 'agent-id' && !agentId) throw new Error('lemonsliceAgentId is required');
  if (avatarSource === 'image-url' && !imageUrl) throw new Error('avatarImageUrl is required');
  if (!['livekit-inference', 'eila-runtime'].includes(voiceProvider)) {
    throw new Error('voiceProvider must be livekit-inference or eila-runtime');
  }
  if (voiceProvider === 'livekit-inference' && !voiceModel) throw new Error('voiceModel is required for livekit-inference');

  return {
    tenantId,
    creatorId,
    fanId,
    creatorName: String(body.creatorName || body.creator_name || creatorId).trim().slice(0, 120),
    creatorSlug: String(body.creatorSlug || body.creator_slug || creatorId).trim().slice(0, 120),
    fanName: String(body.fanName || body.fan_name || 'Member').trim().slice(0, 120),
    avatarProvider,
    avatarSource,
    agentId,
    imageUrl,
    avatarPrompt,
    avatarIdlePrompt,
    voiceProvider,
    voiceModel,
    voiceId,
    instructions,
  };
}

async function createSession(request, env) {
  const supplied = String(request.headers.get('x-blackhole-capability-token') || '');
  if (!supplied || supplied !== capabilitySecret(env)) return json({ ok: false, error: 'Unauthorized' }, 401);

  const input = normalizeSession(await request.json().catch(() => ({})));
  const livekit = liveKitConfig(env);
  const room = `bh-${input.tenantId}-${input.creatorId}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`;
  const relay = await relayToken(env, input.tenantId, room);

  console.log('SESSION_REQUEST', { tenantId: input.tenantId, creatorId: input.creatorId, room });

  const metadata = {
    tenant_id: input.tenantId,
    creator_id: input.creatorId,
    creator_name: input.creatorName,
    creator_slug: input.creatorSlug,
    fan_id: input.fanId,
    avatar_provider: input.avatarProvider,
    avatar_source: input.avatarSource,
    lemonslice_agent_id: input.avatarSource === 'agent-id' ? input.agentId : '',
    avatar_image_url: input.avatarSource === 'image-url' ? input.imageUrl : '',
    avatar_prompt: input.avatarPrompt,
    avatar_idle_prompt: input.avatarIdlePrompt,
    voice_provider: input.voiceProvider,
    voice_model: input.voiceModel,
    voice_id: input.voiceId,
    instructions: input.instructions,
    relay_room: room,
    relay_token: relay,
  };

  const dispatchClient = new AgentDispatchClient(livekit.httpUrl, livekit.apiKey, livekit.apiSecret);
  const dispatch = await dispatchClient.createDispatch(room, livekit.agentName, {
    metadata: JSON.stringify(metadata),
  });
  console.log('DISPATCH_OK', { tenantId: input.tenantId, creatorId: input.creatorId, room, dispatchId: dispatch?.id || null });

  const participant = new AccessToken(livekit.apiKey, livekit.apiSecret, {
    identity: `member-${input.tenantId}-${input.fanId}`.slice(0, 120),
    ttl: 3600,
    name: input.fanName,
  });
  participant.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true, canPublishData: true });

  const token = await participant.toJwt();
  console.log('SESSION_OK', { tenantId: input.tenantId, creatorId: input.creatorId, room });

  return json({
    ok: true,
    mode: 'browser',
    livekitUrl: livekit.wsUrl,
    token,
    room,
    dispatchId: dispatch?.id || null,
    tenantId: input.tenantId,
    creatorId: input.creatorId,
    fanId: input.fanId,
  });
}

async function relayLemonSlice(request, env, url) {
  const tenantId = cleanId(url.searchParams.get('tenant'), 64);
  const room = cleanId(url.searchParams.get('room'), 160);
  if (!tenantId || !room) return json({ ok: false, error: 'tenant and room are required' }, 400);

  if (!(await authorizeRelay(request, env, tenantId, room))) {
    console.warn('RELAY_AUTH_FAIL', { tenantId, room });
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }
  console.log('RELAY_AUTH_OK', { tenantId, room });

  const providerKey = String(env[`LEMONSLICE_${tenantSecretSlot(tenantId)}_API_KEY`] || '').trim();
  if (!providerKey) return json({ ok: false, error: `LemonSlice key missing for ${tenantId}` }, 503);

  const body = new Uint8Array(await request.arrayBuffer());
  const upstream = await fetch(String(env.LEMONSLICE_API_URL || 'https://lemonslice.com/api/liveai/sessions'), {
    method: 'POST',
    headers: {
      'x-api-key': providerKey,
      'content-type': request.headers.get('content-type') || 'application/json',
      accept: 'application/json',
    },
    body,
  });

  console.log('LEMONSLICE_STATUS', { tenantId, room, status: upstream.status });
  const headers = new Headers(upstream.headers);
  headers.set('cache-control', 'no-store');
  return new Response(upstream.body, { status: upstream.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return json({
        ok: true,
        service: 'blackhole-video-worker',
        version: 'lean-v1',
        livekitConfigured: Boolean(env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET),
        agentName: String(env.VIDEO_AGENT_NAME || ''),
        relayAuth: 'room-scoped-hmac',
      });
    }

    try {
      if (request.method === 'POST' && url.pathname === '/internal/video/session') {
        return await createSession(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/internal/lemonslice/sessions') {
        return await relayLemonSlice(request, env, url);
      }
      return json({ ok: false, error: 'route not found' }, 404);
    } catch (error) {
      console.error('VIDEO_WORKER_ERROR', error instanceof Error ? error.message : String(error));
      return json({ ok: false, error: error instanceof Error ? error.message : 'video worker failure' }, 500);
    }
  },
};
