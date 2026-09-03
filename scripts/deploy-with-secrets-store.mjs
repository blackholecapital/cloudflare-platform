#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const WRANGLER_VERSION = process.env.WRANGLER_VERSION || '4.127.1';
const WRANGLER = ['--yes', `wrangler@${WRANGLER_VERSION}`];

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { config:'', store:'default_secrets_store', bindings:[], passthrough:[] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--config') out.config = argv[++i] || '';
    else if (arg === '--store') out.store = argv[++i] || '';
    else if (arg === '--bind') out.bindings.push(argv[++i] || '');
    else if (arg === '--') { out.passthrough.push(...argv.slice(i + 1)); break; }
    else fail(`Unknown argument: ${arg}`);
  }
  if (!out.config) fail('--config is required');
  if (!out.store) fail('--store is required');
  if (!out.bindings.length) fail('At least one --bind BINDING=SECRET_NAME is required');
  out.bindings = out.bindings.map((pair) => {
    const eq = pair.indexOf('=');
    if (eq <= 0 || eq === pair.length - 1) fail(`Invalid --bind value: ${pair}`);
    const binding = pair.slice(0, eq).trim();
    const secretName = pair.slice(eq + 1).trim();
    if (!/^[A-Z0-9_]+$/i.test(binding)) fail(`Invalid binding name: ${binding}`);
    if (!/^[A-Z0-9_\-.]+$/i.test(secretName)) fail(`Invalid secret name: ${secretName}`);
    return { binding, secretName };
  });
  return out;
}

function run(command, args, { capture = false, timeoutMs = 120000 } = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    timeout: timeoutMs,
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      CI: 'true',
      WRANGLER_SEND_METRICS: 'false',
    },
  });
  if (result.error?.code === 'ETIMEDOUT') {
    fail(`${command} exceeded ${Math.ceil(timeoutMs / 60000)} minutes`);
  }
  if (result.error) fail(result.error.message);
  if (result.status !== 0) {
    if (capture) {
      if (result.stdout) process.stderr.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    fail(`${command} exited with ${result.status}`);
  }
  return result;
}

function stripAnsi(value='') {
  return String(value).replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, '');
}

function resolveStoreId(storeName) {
  console.log(`Resolving Cloudflare Secrets Store '${storeName}'...`);
  const result = run(
    'npx',
    [...WRANGLER, 'secrets-store', 'store', 'list', '--remote'],
    { capture:true, timeoutMs:120000 },
  );
  const output = stripAnsi(`${result.stdout || ''}\n${result.stderr || ''}`);
  for (const line of output.split(/\r?\n/)) {
    if (!line.includes(storeName)) continue;
    const id = line.match(/\b[0-9a-f]{32}\b/i)?.[0];
    if (id) return id;
  }
  fail(`Secrets Store '${storeName}' was not found. Run: npx wrangler@${WRANGLER_VERSION} secrets-store store list --remote`);
}

function bindingToml(storeId, bindings) {
  return bindings.map(({ binding, secretName }) => `\n[[secrets_store_secrets]]\nbinding = "${binding}"\nstore_id = "${storeId}"\nsecret_name = "${secretName}"\n`).join('');
}

const args = parseArgs(process.argv.slice(2));
const configPath = path.resolve(args.config);
if (!fs.existsSync(configPath)) fail(`Config not found: ${configPath}`);

const source = fs.readFileSync(configPath, 'utf8');
if (/\[\[secrets_store_secrets\]\]/.test(source)) {
  fail('Base config already contains Secrets Store bindings. Keep the source config secret-ID-free and use this deploy helper.');
}

const storeId = resolveStoreId(args.store);
const generated = `${source.trimEnd()}\n${bindingToml(storeId, args.bindings)}`;
const generatedPath = path.join(path.dirname(configPath), `.wrangler.secrets-store.${process.pid}.toml`);

try {
  fs.writeFileSync(generatedPath, generated, { mode:0o600 });
  console.log(`Secrets Store: ${args.store} (${storeId})`);
  console.log(`Binding ${args.bindings.length} centralized secret(s); values never leave Cloudflare.`);
  console.log('Deploying from committed relay configuration in non-interactive mode...');
  run(
    'npx',
    [...WRANGLER, 'deploy', '--config', generatedPath, ...args.passthrough],
    { timeoutMs: 15 * 60 * 1000 },
  );
} finally {
  try { fs.unlinkSync(generatedPath); } catch {}
}
