import { Hono } from 'hono';
import { getCustomerState } from './routes/state.js';
import { listWorkers, inspectWorker } from './providers/workers.js';
import { authorize, operator, legacyRequest, createTarget, readTarget } from './security.js';
import { errorResponse, fail, id } from '../contracts/saas-v1.mjs';
const app = new Hono();
app.options('*', c => c.body(null, 204));
app.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store'); c.header('X-Content-Type-Options', 'nosniff');
  c.header('Access-Control-Allow-Origin', 'https://onboard.blackholecapital.xyz');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Ops-Token');
  const path = new URL(c.req.url).pathname;
  // Public metadata is exact-route only. Unknown aliases also encounter auth.
  if (!(c.req.method === 'GET' && ['/', '/api/health'].includes(path))) c.set('principal', await authorize(c.req.raw, c.env));
  if (new URL(c.req.url).search) fail('unknown_query');
  await next();
});
app.get('/', c => c.json({ service: 'Cloudflare Operations Platform', version: '1.2.0', status: 'online' }));
app.get('/api/health', c => c.json({ service: 'Cloudflare Operations Platform', legacyExecution: false, tenantEnrollment: false }));
app.get('/api/workers', async c => { operator(c.get('principal')); const workers = await listWorkers(c.env); return c.json({ count: workers.length, workers }); });
app.get('/api/workers/:name', async c => { operator(c.get('principal')); id(c.req.param('name')); return c.json(await inspectWorker(c.env, c.req.param('name'))); });
// Raw Worker source may contain embedded credentials. Keep the legacy route fail-closed.
app.get('/api/workers/:name/source', c => { operator(c.get('principal')); fail('source_export_unavailable', 503); });
app.get('/api/customer/:id', async c => {
  operator(c.get('principal')); const customer = id(c.req.param('id'));
  const state = await getCustomerState(c.env, customer); if (!state) fail('customer_not_found', 404);
  return c.json({ legacy: true, ownershipVerified: false, customer: state.customer, resources: state.resources.map(r => ({ id: r.id, resource_type: r.resource_type, resource_id: r.resource_id, resource_name: r.resource_name, created_at: r.created_at })) });
});
app.post('/api/preview', async c => {
  operator(c.get('principal')); const request = await legacyRequest(c.req.raw);
  // A company/slug may describe a legacy proposal, but never authorizes adoption.
  return c.json({ status: 'unavailable', executionEnabled: false, reason: 'legacy_allocator_not_accepted', requestedServices: request.services, tenantEnrollment: false });
});
app.post('/api/provision', async c => {
  operator(c.get('principal')); await legacyRequest(c.req.raw);
  if (c.env.LEGACY_PROVISION_EXECUTION !== 'true') fail('legacy_execution_disabled', 503);
  // Even an accidentally enabled gate cannot certify the known broken allocator.
  fail('legacy_allocator_not_accepted', 503);
});
app.post('/api/tenant-enrollment', c => { operator(c.get('principal')); fail('product_adapter_required', 501); });
app.post('/api/targets', async c => { operator(c.get('principal')); return c.json(await createTarget(c.req.raw, c.env), 201); });
app.get('/api/targets/:id', async c => c.json(await readTarget(c.env, c.get('principal'), c.req.param('id'))));
app.notFound(() => Response.json({ error: 'not_found' }, { status: 404 }));
app.onError((error) => errorResponse(error));
export default app;
