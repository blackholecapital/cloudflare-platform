import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function cleanId(value, max = 96) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, max);
}

function tenantSecretSlot(tenantId) {
  return String(tenantId || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function digest(value) {
  return new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value || ''))),
  );
}

async function secretsEqual(a, b) {
  const left = await digest(a);
  const right = await digest(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

async function authorize(request, env) {
  const configured = String(env.BLACKHOLE_CAPABILITY_TOKEN || '');
  if (!configured) return json({ ok: false, error: 'BLACKHOLE_CAPABILITY_TOKEN is not configured' }, 503);

  const provided = String(
    request.headers.get('x-blackhole-capability-token')
      || request.headers.get('x-runtime-token')
      || request.headers.get('x-api-key')
      || '',
  );

  if (!provided || !(await secretsEqual(provided, configured))) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }
  return null;
}

function liveKitHttpUrl(value) {
  const url = new URL(String(value || ''));
  if (url.protocol === 'wss:') url.protocol = 'https:';
  if (url.protocol === 'ws:') url.protocol = 'http:';
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('LIVEKIT_URL must be ws(s) or http(s)');
  return url.origin;
}

function liveKitCredentials(env) {
  const apiKey = String(env.LIVEKIT_API_KEY || '').trim();
  const apiSecret = String(env.LIVEKIT_API_SECRET || '').trim();
  const host = liveKitHttpUrl(env.LIVEKIT_URL);
  if (!apiKey || !apiSecret) throw new Error('LiveKit API key/secret are not configured');
  return { apiKey, apiSecret, host };
}

async function liveKitParticipantToken(env, room, identity, name) {
  const { apiKey, apiSecret } = liveKitCredentials(env);
  const token = new AccessToken(apiKey, apiSecret, {
    identity: String(identity),
    ttl: 3600,
  });
  token.name = String(name || identity);
  token.addGrant({
    roomJoin: true,
    room: String(room),
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return token.toJwt();
}

function requiredString(body, camel, snake = camel, max = 5000) {
  const value = String(body?.[camel] ?? body?.[snake] ?? '').trim().slice(0, max);
  if (!value) throw new Error(`${camel} is required`);
  return value;
}

function normalizeSession(body = {}) {
  const tenantId = cleanId(body.tenantId || body.tenant_id, 64);
  const creatorId = cleanId(body.creatorId || body.creator_id || body.subjectId || body.subject_id, 64);
  const fanId = cleanId(body.fanId || body.fan_id || crypto.randomUUID(), 96) || crypto.randomUUID();
  const avatarProvider = requiredString(body, 'avatarProvider', 'avatar_provider', 64).toLowerCase();
  const avatarSource = requiredString(body, 'avatarSource', 'avatar_source', 64).toLowerCase();
  const voiceProvider = requiredString(body, 'voiceProvider', 'voice_provider', 64).toLowerCase();
  const voiceModel = String(body.voiceModel || body.voice_model || '').trim().slice(0, 160);
  const voiceId = requiredString(body, 'voiceId', 'voice_id', 160);
  const instructions = requiredString(body, 'instructions', 'instructions', 5000);
  const agentId = String(body.lemonsliceAgentId || body.lemonslice_agent_id || body.agentId || '').trim().slice(0, 240);
  const imageUrl = String(body.avatarImageUrl || body.avatar_image_url || '').trim().slice(0, 2000);

  if (!tenantId) throw new Error('tenantId is required');
  if (!creatorId) throw new Error('creatorId is required');
  if (avatarProvider !== 'lemonslice') throw new Error('avatarProvider must be lemonslice');
  if (!['agent-id', 'image-url'].includes(avatarSource)) throw new Error('avatarSource must be agent-id or image-url');
  if (avatarSource === 'agent-id' && !agentId) throw new Error('lemonsliceAgentId is required for agent-id source');
  if (avatarSource === 'image-url' && !imageUrl) throw new Error('avatarImageUrl is required for image-url source');
  if (voiceProvider !== 'livekit-inference') throw new Error('voiceProvider must be livekit-inference');
  if (!voiceModel) throw new Error('voiceModel is required');

  return {
    tenantId,
    creatorId,
    fanId,
    avatarProvider,
    avatarSource,
    voiceProvider,
    voiceModel,
    voiceId,
    instructions,
    agentId,
    imageUrl,
    product: String(body.product || tenantId).trim().slice(0, 120),
    creatorName: String(body.creatorName || body.creator_name || creatorId).trim().slice(0, 120),
    creatorSlug: String(body.creatorSlug || body.creator_slug || creatorId).trim().slice(0, 120),
    fanName: String(body.fanName || body.fan_name || 'Member').trim().slice(0, 120),
    avatarPrompt: String(body.avatarPrompt || body.avatar_prompt || 'a person talking').trim().slice(0, 500),
    avatarIdlePrompt: String(body.avatarIdlePrompt || body.avatar_idle_prompt || 'a person listening').trim().slice(0, 500),
  };
}

function cleanMetadata(metadata = {}) {
  const allowed = [
    'tenant_id', 'product', 'creator_id', 'creator_name', 'creator_slug', 'fan_id',
    'avatar_provider', 'avatar_source', 'lemonslice_agent_id', 'avatar_image_url',
    'avatar_prompt', 'avatar_idle_prompt', 'voice_provider', 'voice_model', 'voice_id',
    'instructions',
  ];
  const out = {};
  for (const key of allowed) {
    const value = metadata[key];
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  }
  return out;
}

async function emit(env, event) {
  const payload = { ...event, ts: Date.now() };
  try {
    if (env.EVENTS) await env.EVENTS.send(payload);
  } catch (error) {
    console.error('blackhole-video queue emit failed', error);
  }
  try {
    if (env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: [String(event.type || 'video.event'), String(event.tenantId || ''), String(event.creatorId || ''), String(event.room || '')],
        doubles: [Date.now()],
      });
    }
  } catch (error) {
    console.error('blackhole-video analytics emit failed', error);
  }
}

async function dispatchAgent(env, room, metadata) {
  const { apiKey, apiSecret, host } = liveKitCredentials(env);
  const agentName = String(env.VIDEO_AGENT_NAME || '').trim();
  if (!agentName) throw new Error('VIDEO_AGENT_NAME is not configured');

  const client = new AgentDispatchClient(host, apiKey, apiSecret);
  try {
    const dispatch = await client.createDispatch(String(room), agentName, {
      metadata: JSON.stringify(cleanMetadata(metadata)),
    });
    return dispatch?.id || null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`LiveKit dispatch failed: ${message}`);
  }
}

async function createBrowserSession(request, env) {
  const body = await request.json().catch(() => ({}));
  const input = normalizeSession(body);
  const room = `bh-${input.tenantId}-${input.creatorId}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`;

  const metadata = {
    tenant_id: input.tenantId,
    product: input.product,
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
  };

  const dispatchId = await dispatchAgent(env, room, metadata);
  const identity = `member-${input.tenantId}-${input.fanId}`.slice(0, 120);
  const token = await liveKitParticipantToken(env, room, identity, input.fanName);

  await emit(env, {
    type: 'video.session.created',
    tenantId: input.tenantId,
    creatorId: input.creatorId,
    room,
    dispatchId,
    avatarSource: input.avatarSource,
    voiceProvider: input.voiceProvider,
  });

  return json({
    ok: true,
    mode: 'browser',
    livekitUrl: String(env.LIVEKIT_URL),
    token,
    room,
    dispatchId,
    tenantId: input.tenantId,
    creatorId: input.creatorId,
    fanId: input.fanId,
  });
}

async function relayLemonSlice(request, env, url) {
  const tenantId = cleanId(url.searchParams.get('tenant'), 64);
  if (!tenantId) return json({ ok: false, error: 'tenant query parameter is required' }, 400);

  const slot = tenantSecretSlot(tenantId);
  if (!slot) return json({ ok: false, error: 'invalid tenant' }, 400);

  const providerKey = String(env[`LEMONSLICE_${slot}_API_KEY`] || '');
  if (!providerKey) {
    return json({ ok: false, error: `LemonSlice provider key is not configured for tenant ${tenantId}` }, 503);
  }

  const requestBody = new Uint8Array(await request.arrayBuffer());
  const response = await fetch(String(env.LEMONSLICE_API_URL || 'https://lemonslice.com/api/liveai/sessions'), {
    method: 'POST',
    headers: {
      'x-api-key': providerKey,
      'content-type': request.headers.get('content-type') || 'application/json',
      accept: request.headers.get('accept') || 'application/json',
    },
    body: requestBody,
  });

  await emit(env, {
    type: 'video.lemonslice.relay',
    tenantId,
    providerStatus: response.status,
    bytes: requestBody.byteLength,
  });

  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store');
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return json({
        ok: true,
        service: 'blackhole-video-worker',
        tenantMode: 'explicit-fail-closed',
        livekitConfigured: Boolean(env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET),
        agentName: String(env.VIDEO_AGENT_NAME || ''),
        authMode: 'official-livekit-server-sdk',
      });
    }

    if (request.method === 'POST' && url.pathname === '/internal/video/session') {
      const denied = await authorize(request, env);
      if (denied) return denied;
      try {
        return await createBrowserSession(request, env);
      } catch (error) {
        return json({ ok: false, error: error instanceof Error ? error.message : 'video session failed' }, 400);
      }
    }

    if (request.method === 'POST' && url.pathname === '/internal/lemonslice/sessions') {
      const denied = await authorize(request, env);
      if (denied) return denied;
      return relayLemonSlice(request, env, url);
    }

    return json({ ok: false, error: 'route not found' }, 404);
  },
};
