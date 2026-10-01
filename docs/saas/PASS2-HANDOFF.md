# Pass 2 handoff

**Do not start Pass 2 from this delivery yet. PASS 1 INCOMPLETE.** No candidate has owner acceptance or release approval. The external manifest records exact local branch/base/head/tree hashes after final commits; the external copy of this handoff includes that checkpoint table. Repository copies intentionally do not embed their own final HEAD.

The candidate foundation uses BHC STORE_DB, existing customer and operator authentication, shared-tenant product instances, immutable registry/order snapshots and inactive desired entitlements. Generic contract version bhc-saas-v1; checkout authentication bhc-checkout-auth-v1; legacy recovery payme-idempotent-v1. There is no per-customer deployment allocator. PayMe-v3-Pro remains untouched at d3ad919dcd52633bd6617c6dbd7816fa41b3d845.

Prerequisites for a later accepted checkpoint: complete authorized clones including BHC assets; resolve/re-run four documented baseline presentation failures; review signed-boundary consumer compatibility and bundle prerequisite ancestry. Refer to PASS1-IMPLEMENTATION-REPORT.md and the validation logs. No live credentials or providers are needed for the local tests. Native authentication and binary retrieval are environment gaps, not permission to weaken tests or authorization.

After separate acceptance, later payment work must resolve:

- BHC subscription revenue versus customer merchant receipts: separate merchant/account mappings, credentials, recipients and evidence. Do not treat PayMe's existing single-account application as a completed shared-tenant billing service.
- Versioned immutable order/price/terms/billing-start evidence and authenticated normalized payment events. Completion/status/return URLs are not settlement. Do not mount the legacy USDC verifier; its RPC-error fallback falsely returns verified=true.
- Durable provider event/outbox processing, retries, loss recovery and subscription invoice/session binding. No transaction is atomic across STORE_DB, BHC_LEADS_DB, KV, provider and email.
- Coordinated Checkout consumer migration, trusted callback map and explicit historical KV-context adoption. Existing exact-repeat recovery must not mint new orders after uncertainty.
- Explicit commercial approval of proposed PayMe prices and unset Sniper tiers. No current delivery file approves or activates these.
- Shared product bootstrap/configuration/entitlement adapters with product/environment/version/target acceptance evidence. No adapter is certified; Gallery/Showroom repositories were not merged or hardened. Future account/distribution refs are unverified/inactive.
- Secure guest/legacy claim authority, later invitations/access state transitions and private R2 download redemption. No live access links or redemption credentials currently exist.

No push, PR, merge, deployment, remote migration, Cloudflare mutation, payment/provider activity, message, credential change or sales activation is part of this handoff.
