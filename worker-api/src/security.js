import { equal, fail, id, jsonBody, object, oneOf, target, uuid } from '../contracts/saas-v1.mjs';
export async function authorize(request, env) {
  if(env.OPS_API_TOKEN && env.OPS_API_TOKEN===env.CLOUDFLARE_API_TOKEN)fail('operator_credential_not_separate',503);
  if (request.headers.has('cookie')) fail('operator_or_service_required', 403);
  const authorization = request.headers.get('authorization') || '';
  const provided = request.headers.get('x-ops-token') || (/^Bearer /i.test(authorization) ? authorization.slice(7) : '');
  if (env.OPS_API_TOKEN && provided && await equal(provided, env.OPS_API_TOKEN)) return { kind: 'operator' };
  let credentials;
  try { credentials = JSON.parse(env.PLATFORM_SERVICE_CREDENTIALS || '{}'); } catch { fail('auth_unconfigured', 503); }
  const caller = request.headers.get('x-platform-service');
  const scoped = caller && Object.hasOwn(credentials, caller) ? credentials[caller] : null;
  if (scoped && typeof scoped.secretRef === 'string' && typeof env[scoped.secretRef] === 'string' && env[scoped.secretRef].length >= 32 && provided && await equal(provided, env[scoped.secretRef])) {
    if (!Array.isArray(scoped.targetIds) || !Array.isArray(scoped.productIds) || !Array.isArray(scoped.operations)) fail('auth_unconfigured', 503);
    return { kind: 'service', ...scoped, caller };
  }
  fail(env.OPS_API_TOKEN || Object.keys(credentials).length ? 'unauthorized' : 'auth_unconfigured', env.OPS_API_TOKEN || Object.keys(credentials).length ? 401 : 503);
}
export function operator(principal) { if (principal.kind !== 'operator') fail('operator_required', 403); }
export function scoped(principal, operation, record) {
  if (principal.kind === 'operator') return;
  if (!principal.operations.includes(operation) || !principal.targetIds.includes(record.id) || !principal.productIds.includes(record.product_id) || principal.environment !== record.environment) fail('scope_denied', 403);
}
export async function legacyRequest(request) {
  const body = await jsonBody(request, 8192);
  object(body, ['company', 'services', 'domain'], ['company', 'services']);
  if (typeof body.company !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,99}$/.test(body.company)) fail('invalid_company');
  if (!Array.isArray(body.services) || !body.services.length || body.services.length > 6 || new Set(body.services).size !== body.services.length) fail('invalid_services');
  body.services.forEach(s => oneOf(s, ['Worker', 'Cloudflare Pages', 'D1 Database', 'KV', 'Queue', 'R2']));
  if (body.domain !== undefined && !/^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/.test(body.domain)) fail('invalid_domain');
  return body;
}
export async function createTarget(request, env) {
  const input = await jsonBody(request, 4096);
  object(input, ['accountRef', 'environment', 'purpose', 'credentialRef', 'productId']); id(input.productId);
  const record = target({ id: crypto.randomUUID(), provider: 'cloudflare', accountRef: input.accountRef, environment: input.environment, purpose: input.purpose, credentialRef: input.credentialRef, verification: 'unverified', active: false });
  // References must already be declared server-side; this endpoint never connects accounts.
  let accounts; try { accounts = JSON.parse(env.PLATFORM_ACCOUNT_REFERENCES || '{}'); } catch { fail('target_config_unavailable', 503); }
  const account = Object.hasOwn(accounts, record.accountRef) ? accounts[record.accountRef] : null;
  if (!account || account.credentialRef !== record.credentialRef || account.environment !== record.environment) fail('unknown_account_reference', 409);
  await env.STATE_DB.batch([
    env.STATE_DB.prepare('INSERT INTO deployment_targets(id,provider,account_ref,environment,purpose,credential_ref,product_id,verification,active) VALUES(?,?,?,?,?,?,?,?,0)').bind(record.id, record.provider, record.accountRef, record.environment, record.purpose, record.credentialRef, input.productId, 'unverified'),
    env.STATE_DB.prepare('INSERT INTO platform_audit(id,action,target_id) VALUES(?,?,?)').bind(crypto.randomUUID(), 'target_registered', record.id),
  ]);
  return { ...record, credentialRef: undefined, productId: input.productId };
}
export async function readTarget(env, principal, targetId) {
  uuid(targetId);
  // Deny an out-of-scope opaque identifier BEFORE touching state.
  if (principal.kind !== 'operator' && (!principal.operations.includes('target.inspect') || !principal.targetIds.includes(targetId))) fail('scope_denied', 403);
  if(principal.kind !== 'operator') {
    let targets; try { targets=JSON.parse(env.PLATFORM_TARGET_SCOPES || '{}'); } catch { fail('scope_unconfigured',503); }
    const expected=Object.hasOwn(targets,targetId)?targets[targetId]:null;
    if(!expected || !principal.productIds.includes(expected.productId) || principal.environment!==expected.environment)fail('scope_denied',403);
  }
  const row = await env.STATE_DB.prepare('SELECT id,provider,account_ref,environment,purpose,product_id,verification,active FROM deployment_targets WHERE id=?').bind(targetId).first();
  if (!row) fail('target_not_found', 404); scoped(principal, 'target.inspect', row);
  const ownership=await env.STATE_DB.prepare('SELECT id,resource_type,provider_resource_id,organization_id,instance_id FROM resource_ownership WHERE target_id=? AND product_id=?').bind(row.id,row.product_id).all();
  return { ...row, ownership:ownership.results, available: false, enrollment: 'not_an_infrastructure_operation' };
}
