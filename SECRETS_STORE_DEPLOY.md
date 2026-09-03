# Centralized Cloudflare Secrets Store deploys

Canonical store name: `default_secrets_store`

This repository provides `scripts/deploy-with-secrets-store.mjs` so projects can bind account-level Cloudflare Secrets Store entries without committing a store ID or copying secret values into project repositories.

## How it works

The helper:

1. uses the current Wrangler authentication to list remote Secrets Stores;
2. resolves the ID of `default_secrets_store` by name;
3. appends temporary `[[secrets_store_secrets]]` bindings to a generated Wrangler TOML file;
4. deploys the Worker with that generated config; and
5. deletes the generated config in a `finally` block.

No secret value is read, printed, copied to disk, or committed. Cloudflare injects the bound value into the Worker at runtime.

## Generic usage

```bash
node scripts/deploy-with-secrets-store.mjs \
  --config path/to/wrangler.toml \
  --store default_secrets_store \
  --bind WORKER_BINDING=XYZ_DEMO_SECRET_NAME \
  --bind SECOND_BINDING=XYZ_DEMO_OTHER_SECRET
```

Additional Wrangler deploy flags may be forwarded after `--`.

## Shared video worker

```bash
npm run deploy:video:store
```

This currently maps:

- `XYZ_DEMO_LIVEKIT_API_KEY` -> `LIVEKIT_API_KEY`
- `XYZ_DEMO_LIVEKIT_API_SECRET` -> `LIVEKIT_API_SECRET`
- `XYZ_DEMO_EILA_RUNTIME_TOKEN` -> `BLACKHOLE_CAPABILITY_TOKEN`

The EILA Overwatch repository uses the same helper through its own `npm run deploy:worker:store` wrapper and maps `XYZ_DEMO_EILA_RUNTIME_TOKEN` to both `EILA_RUNTIME_TOKEN` and `BLACKHOLE_CAPABILITY_TOKEN`.

## Permissions

The Wrangler identity performing a deployment with Secrets Store bindings needs Cloudflare permission to attach account secrets to Workers. For CI/CD tokens, grant the account-level Secrets Store edit/deployer permission in addition to the normal Workers deployment permissions. The bound secrets themselves must include the `workers` scope.

## LemonSlice

The current centralized handoff does not list a LemonSlice secret. The already-working `blackhole-video-worker` LemonSlice secret remains in place for the existing avatar pipeline. When LemonSlice is added to `default_secrets_store`, it can be mapped with this same helper and the legacy Worker-level secret can be retired.
