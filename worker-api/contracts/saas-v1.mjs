/** Canonical generic contract source. Copies in other authorized repos are fingerprinted. */
export const VERSION = 'bhc-saas-v1';
export const CHECKOUT_AUTH = 'bhc-checkout-auth-v1';
export class ContractError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export const fail = (code, status = 400) => { throw new ContractError(code, status); };
export function object(value, allowed, required = allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k)) || required.some(k => !Object.hasOwn(value, k))) fail('invalid_fields');
  return value;
}
export function text(value, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > max || /[\x00-\x1f<>]/.test(value)) fail('invalid_text');
  return value;
}
export function id(value) { if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) fail('invalid_id'); return value; }
export function uuid(value) { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value || '')) fail('invalid_uuid'); return value; }
export function oneOf(value, choices) { if (!choices.includes(value)) fail('invalid_choice'); return value; }
export function integer(value, min = 0, max = Number.MAX_SAFE_INTEGER) { if (!Number.isSafeInteger(value) || value < min || value > max) fail('invalid_integer'); return value; }
export function list(value, validate = id, max = 128, min = 1) { if (!Array.isArray(value) || value.length < min || value.length > max) fail('invalid_list'); value.forEach(validate); if (new Set(value.map(canonical)).size !== value.length) fail('duplicate_values'); return value; }
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
const bytes = value => new TextEncoder().encode(value);
export const hex = value => [...new Uint8Array(value)].map(n => n.toString(16).padStart(2, '0')).join('');
export const digest = async value => hex(await crypto.subtle.digest('SHA-256', bytes(value)));
export async function equal(a, b) {
  const [x, y] = await Promise.all([digest(String(a)), digest(String(b))]);
  let difference = 0; for (let n = 0; n < x.length; n++) difference |= x.charCodeAt(n) ^ y.charCodeAt(n);
  return difference === 0;
}
export async function boundedText(request, max = 32768) {
  if (Number(request.headers.get('content-length')) > max) fail('body_too_large', 413);
  const reader = request.body?.getReader(); if (!reader) return '';
  const parts = []; let size = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > max) { await reader.cancel(); fail('body_too_large', 413); } parts.push(value); } }
  finally { reader.releaseLock(); }
  const result = new Uint8Array(size); let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(result); } catch { return fail('invalid_encoding'); }
}
export async function jsonBody(request, max = 32768) {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '')) fail('json_required', 415);
  try { return JSON.parse(await boundedText(request, max)); } catch (e) { if (e instanceof ContractError) throw e; fail('invalid_json'); }
}
export function errorResponse(error) {
  return Response.json({ error: error instanceof ContractError ? error.code : 'service_unavailable', correlationId: crypto.randomUUID() }, { status: error instanceof ContractError ? error.status : 503, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
export function controls(value) {
  object(value, ['sales', 'fulfillment', 'delivery', 'setupAssistance']);
  oneOf(value.sales, ['unpublished', 'quote_only', 'purchasable']);
  oneOf(value.fulfillment, ['white_glove', 'automated']);
  oneOf(value.delivery, ['hosted_workspace', 'membership', 'download']);
  oneOf(value.setupAssistance, ['included', 'optional_paid_upgrade']);
  return value;
}
export function price(value) {
  object(value, ['amountMinor', 'currency', 'kind', 'interval'], ['amountMinor', 'currency', 'kind']);
  integer(value.amountMinor, 0, 100000000); oneOf(value.currency, ['USD']);
  oneOf(value.kind, ['setup', 'recurring', 'one_time']);
  if (value.kind === 'recurring') oneOf(value.interval, ['month', 'year']); else if (value.interval !== undefined) fail('unexpected_interval');
  return value;
}
export function offering(value) {
  object(value, ['offerId', 'productId', 'name', 'route', 'configurationIds', 'controls', 'prices', 'billingStartPolicy', 'termsVersion', 'policyVersion', 'onboardingSchema', 'integrationVersion', 'setupOfferId', 'targetId', 'artifact', 'source', 'maxConfigurations'], ['offerId', 'productId', 'name', 'route', 'configurationIds', 'controls', 'prices', 'billingStartPolicy', 'termsVersion', 'policyVersion', 'onboardingSchema', 'integrationVersion', 'source']);
  id(value.offerId); id(value.productId); text(value.name); text(value.route);
  if (!/^\/[a-z0-9/-]+\/(?:#[a-z0-9-]+)?$/.test(value.route)) fail('invalid_route');
  list(value.configurationIds); if (value.maxConfigurations !== undefined) integer(value.maxConfigurations, 1, value.configurationIds.length); controls(value.controls); list(value.prices, price, 8, 0);
  text(value.billingStartPolicy); id(value.termsVersion); id(value.policyVersion); id(value.onboardingSchema); id(value.integrationVersion); text(value.source, 500);
  if (value.setupOfferId !== undefined) id(value.setupOfferId);
  if (value.targetId !== undefined) uuid(value.targetId);
  if (value.artifact !== undefined) artifact(value.artifact);
  if (value.controls.delivery === 'download' && !value.artifact) fail('artifact_required');
  if (value.controls.delivery !== 'download' && value.artifact) fail('unexpected_artifact');
  return value;
}
export function artifact(value) {
  object(value, ['artifactId', 'version', 'storageRef', 'documents', 'visibility']);
  id(value.artifactId); id(value.version); id(value.storageRef); list(value.documents, id, 32, 0); oneOf(value.visibility, ['private']); return value;
}
export function target(value) {
  object(value, ['id', 'provider', 'accountRef', 'environment', 'purpose', 'credentialRef', 'verification', 'active']);
  uuid(value.id); oneOf(value.provider, ['cloudflare']); id(value.accountRef); oneOf(value.environment, ['development', 'staging', 'production']);
  oneOf(value.purpose, ['shared_product', 'customer_production', 'distribution']); id(value.credentialRef);
  oneOf(value.verification, ['unverified', 'verified']); if (typeof value.active !== 'boolean' || (value.active && value.verification !== 'verified')) fail('invalid_target_status'); return value;
}
export function enrollment(value) {
  object(value, ['version', 'operation', 'organizationId', 'instanceId', 'orderId', 'productId', 'configurationIds', 'revision', 'adapterVersion', 'targetId', 'idempotencyKey', 'entitlementState']);
  oneOf(value.version, [VERSION]); oneOf(value.operation, ['tenant_enrollment']); uuid(value.organizationId); uuid(value.instanceId); uuid(value.orderId); id(value.productId); list(value.configurationIds); integer(value.revision, 1); id(value.adapterVersion); if (value.targetId !== null) uuid(value.targetId); id(value.idempotencyKey); oneOf(value.entitlementState, ['inactive']); return value;
}
export function handoff(value) {
  object(value, ['version', 'orderId', 'instanceId', 'organizationId', 'inputSchema', 'checklistRef', 'status']);
  oneOf(value.version, [VERSION]); uuid(value.orderId); uuid(value.instanceId); uuid(value.organizationId); id(value.inputSchema); id(value.checklistRef); oneOf(value.status, ['pending', 'review_required']); return value;
}
export function accessDescriptor(value) {
  object(value, ['version', 'instanceId', 'organizationId', 'kind', 'configurationIds', 'state', 'artifact'], ['version', 'instanceId', 'organizationId', 'kind', 'configurationIds', 'state']);
  oneOf(value.version, [VERSION]); uuid(value.instanceId); uuid(value.organizationId); oneOf(value.kind, ['membership', 'download', 'hosted_workspace']); list(value.configurationIds); oneOf(value.state, ['inactive']);
  if (value.kind === 'download') artifact(value.artifact); else if (value.artifact !== undefined) fail('unexpected_artifact'); return value;
}
export function approvedOffer(value) {
  object(value,['version','offer','revision','hash','approval','approvalEvidence']);
  oneOf(value.version,[VERSION]);offering(value.offer);integer(value.revision,1);
  if(!/^[a-f0-9]{64}$/.test(value.hash||''))fail('invalid_offer_hash');
  oneOf(value.approval,['unreviewed','approved','rejected']);
  if(value.approval==='approved')text(value.approvalEvidence,500);
  return value;
}
export function orderSnapshot(value) {
  object(value,['version','offer','revision','hash','approval','approvalEvidence','selectedConfigurationIds','configurationDefinitions']);
  approvedOffer(Object.fromEntries(['version','offer','revision','hash','approval','approvalEvidence'].map(k=>[k,value[k]])));
  list(value.selectedConfigurationIds);
  if(value.approval!=='approved'||value.selectedConfigurationIds.some(id=>!value.offer.configurationIds.includes(id)))fail('invalid_order_snapshot');
  if(!Array.isArray(value.configurationDefinitions)||value.configurationDefinitions.length!==value.selectedConfigurationIds.length)fail('invalid_configuration_definitions');
  for(const c of value.configurationDefinitions){object(c,['id','version','schema_ref','definition_json']);id(c.id);id(c.version);id(c.schema_ref);if(!value.selectedConfigurationIds.includes(c.id))fail('invalid_configuration_definitions');}
  return value;
}
export function ownership(value) {
  object(value,['id','targetId','productId','environment','organizationId','instanceId','resourceType','providerResourceId']);
  uuid(value.id);uuid(value.targetId);id(value.productId);oneOf(value.environment,['development','staging','production']);
  if(value.organizationId!==null)uuid(value.organizationId);if(value.instanceId!==null)uuid(value.instanceId);
  oneOf(value.resourceType,['worker','pages','d1','kv','r2','queue']);id(value.providerResourceId);return value;
}
export function paymentEvidence(value) {
  object(value, ['version', 'eventId', 'orderId', 'sessionId', 'provider', 'moneyFlow', 'merchantRef', 'amountMinor', 'currency', 'paymentState', 'occurredAt']);
  oneOf(value.version, [VERSION]); id(value.eventId); uuid(value.orderId); id(value.sessionId); oneOf(value.provider, ['stripe']); oneOf(value.moneyFlow, ['platform_subscription']); id(value.merchantRef); integer(value.amountMinor); oneOf(value.currency, ['USD']); oneOf(value.paymentState, ['pending', 'paid', 'failed']); integer(value.occurredAt, 1); return value;
}
export function checkoutContext(value) {
  object(value, ['version', 'orderId', 'offerId', 'offerVersion', 'productId', 'configurationId', 'moneyFlow']);
  oneOf(value.version, [VERSION]); id(value.orderId); id(value.offerId); id(value.offerVersion); id(value.productId); id(value.configurationId); oneOf(value.moneyFlow, ['platform_subscription']); return value;
}
const signedMessage = (method, route, caller, keyId, environment, timestamp, expiry, raw) => [CHECKOUT_AUTH, method, route, caller, keyId, environment, timestamp, expiry, raw].join('\n');
export async function serviceHeaders({ method, route, raw = '', caller, keyId, environment, secret, now = Date.now() }) {
  if (typeof secret !== 'string' || secret.length < 32) fail('service_auth_unconfigured', 503);
  id(caller); id(keyId); oneOf(environment, ['development', 'staging', 'production']);
  const timestamp = String(Math.floor(now / 1000)), expiry = String(Number(timestamp) + 120);
  const key = await crypto.subtle.importKey('raw', bytes(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = hex(await crypto.subtle.sign('HMAC', key, bytes(signedMessage(method, route, caller, keyId, environment, timestamp, expiry, raw))));
  return { 'x-bhc-contract': CHECKOUT_AUTH, 'x-bhc-caller': caller, 'x-bhc-key': keyId, 'x-bhc-environment': environment, 'x-bhc-timestamp': timestamp, 'x-bhc-expiry': expiry, 'x-bhc-signature': signature };
}
export async function verifyService(request, raw, config, now = Date.now()) {
  if (!config || typeof config !== 'object' || !Object.keys(config).length) fail('service_auth_unconfigured', 503);
  if (request.headers.has('origin') || request.headers.has('cookie')) fail('internal_service_only', 403);
  const h = request.headers, caller = h.get('x-bhc-caller'), keyId = h.get('x-bhc-key'), environment = h.get('x-bhc-environment'), timestamp = h.get('x-bhc-timestamp'), expiry = h.get('x-bhc-expiry'), signature = h.get('x-bhc-signature');
  const service = Object.hasOwn(config, caller || '') ? config[caller] : null;
  if (!service || h.get('x-bhc-contract') !== CHECKOUT_AUTH || keyId !== service.keyId || environment !== service.environment || !/^\d{10}$/.test(timestamp || '') || !/^\d{10}$/.test(expiry || '') || !/^[a-f0-9]{64}$/.test(signature || '')) fail('invalid_service_auth', 401);
  if (typeof service.secret !== 'string' || service.secret.length < 32) fail('service_auth_unconfigured', 503);
  const current = Math.floor(now / 1000);
  if (Number(timestamp) > current + 15 || Number(expiry) < current || Number(expiry) <= Number(timestamp) || Number(expiry) - Number(timestamp) > 120) fail('expired_service_auth', 401);
  const u = new URL(request.url), key = await crypto.subtle.importKey('raw', bytes(service.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('HMAC', key, Uint8Array.from(signature.match(/../g), x => parseInt(x, 16)), bytes(signedMessage(request.method, u.pathname + u.search, caller, keyId, environment, timestamp, expiry, raw)));
  if (!valid) fail('invalid_service_auth', 401);
  return { caller, environment, service };
}
export function adapterUnavailable(input) { enrollment(input); return { version: VERSION, available: false, code: 'adapter_not_implemented', instanceId: input.instanceId }; }
