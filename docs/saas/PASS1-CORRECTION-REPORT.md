# Pass 1 correction report

Status: **PASS 1 INCOMPLETE**. R1, R2 and R3 are corrected and locally verified. Complete authorized source-checkout validation remains blocked. Nothing is published or deployed; Pass 2 has not started.

## Continuation and provenance

Continued the existing branches without reset, rebase, replacement implementation or lost commits:

| Repository | Original base | Correction base (delivered head) |
|---|---|---|
| BHC | 647ff91e0d2ab67ee77bb1b9df7c35468b74b438 | 54f7d83db6fcd3e2f7edd7a5fb71535ee550f304 |
| cloudflare-platform | 1f00389418ce8a6df8490d0bf50b8a1bc609a2d3 | 9fd5856f7d681c44f2be1f9778b9e56ccced271c |
| Checkout-worker | 57802a78b3876c16ac043073da989e5ca531360a | 91fc438446cc2498c531465dd7f7617f832a81dd |

All three working trees were clean at continuation. The reviewer ZIP's checksums were verified and its documents, original tests and logs preserved separately under reviewer-input. BHC AGENTS.md, its shared runtime boundary and platform AGENTS.md remain applicable. Checkout has no additional AGENTS.md. Open PRs were rechecked read-only: BHC #108/#33/#30, platform #24/#23, Checkout #1. Their branches were not incorporated or modified. The manifest is generated after final commits and records the final heads/trees; no committed document claims its own final HEAD.

PayMe-v3-Pro remains read-only at d3ad919dcd52633bd6617c6dbd7816fa41b3d845. No downstream product is modified. BHC and platform correction commits change documentation only. Their existing shared-tenant implementation is retained.

## Actual before and after evidence

The supplied reviewer tests were copied unchanged into the delivered Checkout branch and executed with Node **24.19.0**, an empty inherited environment and the repository's outbound-network denial preload **before production source edits**. The delivered source blob was 992f6fd3dfdd2bcbdf491714a979511ae3f4ba06.

| Defect | Newly executed delivered-head result | Corrected result |
|---|---|---|
| R1: missing binding | HTTP 200, review_required, 0 writes, 0 callbacks | HTTP 503, checkout_binding_pending; later retry with binding reaches the trusted callback |
| R2: foreign checkout identity | HTTP 200, 1 synthetic provider call, foreign paid row replaced | HTTP 409, 0 provider calls, historical row unchanged |
| R3: paid exact replay | subscription_active/paid became open/unpaid; 2 synthetic calls with the same key | subscription_active/paid preserved; 1 total create call, original creation tuple replayed |

`correction-evidence/review-reproduction.log` records 0/3 passing with application assertion failures, not syntax/import errors. `delivered-trust.log` records 5/5 passing on the delivered source. `reviewer-after.log` records 3/3 passing after correction. R3's repository regression now reads the authoritative D1 record instead of a KV mirror; the assertions are unchanged. The untouched reviewer test remains in reviewer-input. The external reviewer's Node 22 logs are supplied evidence, not represented as this worker's execution.

## R1 — Retry unprocessed supported events

Checkout `src/index.ts::handleStripeWebhook` now classifies supported checkout-session events before binding lookup. A missing/unavailable binding returns 503. Missing callback ownership, missing callback signing configuration or unsuccessful callback delivery also returns a retryable failure. A JSON review flag is never substituted for processing or retention.

This correction deliberately chooses provider redelivery, not a new durable event/outbox ledger. A valid event can update a bound order's monotonic settlement and still return 503 if delivery fails; its retry dispatches the current state. Duplicate callbacks are at-least-once and must remain idempotent downstream. Unsupported invoice/subscription/lifecycle types, malformed session identities and definitively mismatched bound sessions/modes are explicitly ignored with 200, without granting payment. Missing callback authority never falls back to event metadata. Recovery tests cover binding visibility, binding arriving after a provider response, correct destination, repeated delivery, unpaid completion, missing configuration and failed callback delivery.

## R2 — Transactional ownership and creation guard

`src/guard.mjs` and `migrations/0001_checkout_guard.sql` add a narrow shared D1 guard, required as `CHECKOUT_GUARD`. It stores one row per checkout identity, not one infrastructure resource per customer. No live database was created, bound or migrated; wrangler.toml and all existing destinations are unchanged.

The guard uses primary D1 queries (no read-replica Session), an atomic unique insert and conditional execution-lease update. Its SHA-256 covers authenticated caller/environment, full order/product/offer/version/configuration/money-flow context, the validated resolved request and exact Stripe form. A foreign caller or any changed identity/payload conflicts before a provider call. SQL constraints/triggers preserve owner, session, confirmed payment and identity non-reuse. Separate connections to the same real local SQLite file force competing valid callers to observe an initially absent row; exactly one wins, and only one provider POST occurs.

KV is now **read-only historical evidence**, not a lock or mutable status mirror. New state reads/writes use the guard. A visible historical KV record or create intent that lacks a guard reservation is rejected without adoption. Imported historical guard rows have null request_hash and cannot be claimed or retagged by requests, even when KV is temporarily invisible.

Because a negative KV read cannot prove absence, the migration starts with inventory_state=blocked. Claiming requires a server-owned verified complete-inventory hash/evidence record. No HTTP route creates that evidence. Before any separately authorized cutover, old writers must be stopped and all historical identities (including create intents and upstream retained order identities beyond KV expiry) reconciled into immutable reservations. Missing/unreviewed identities keep cutover blocked; merely toggling a preference is not verification. Only synthetic fixtures mark their empty/test inventory verified in this pass. This migration prerequisite is explicit, not a claim that live historical adoption has happened.

## R3 — Separate replay from payment authority

`bindCreateResult` merges inside the database and never takes settlement state from a provider creation response. Session binding is immutable. `applySessionEvent` conditionally preserves paid state within the same SQL statement; a delayed create write or repeated unpaid/failed/expired event cannot restore unpaid. The database also rejects a direct paid downgrade. An already-paid exact create replay returns HTTP 200 with the original checkout/session/redirect tuple plus the current paid status; it creates no new charge/session/key and grants no customer access. The original URL identifies the original completed provider session.

Recoverable uncertain execution retains the existing `payme-idempotent-v1` reference, exact form, `payme:<checkout_id>` Stripe key and 23-hour retry boundary. Concurrent identical calls either receive the stored tuple or a retryable in-progress response. Execution leases outlast the provider timeout, survive restart and allow only the original keyed retry. An uncertain legacy request with no provider key is held for review, never blindly retried or assigned a new key. A settled status lookup also cannot replace known paid state with a stale provider response.

Tests exercise delayed create completion after payment, webhook arrival between response and binding write, interleaved paid/unpaid events, changed retries, response loss, process interruption, persistent restart, atomic rollback, immutable ownership and failure before provider execution. The adapter executes real SQLite constraints/transactions, not mocks that accept arbitrary SQL. This is local SQLite/D1-compatible execution, not a remote D1 or deployed workerd certification.

## Declared, locked tooling

Checkout now has its own package-lock.json and `npm run build`. Initial resolution of the original broad Wrangler range selected 4.146.0, whose optional peer requires Workers types v5; npm rejected that combination. No force or legacy-peer-deps bypass was used. A reviewed compatible **Wrangler 4.100.0** is pinned within the existing ^4.11.1 range, with a June 2026 local runtime newer than the existing April 8 compatibility date. No Wrangler deploy/dev command was run.

The final own-repository setup is TypeScript **5.9.3**, Workers types **4.20260702.1**, Wrangler **4.100.0**, and directly declared build-only esbuild **0.25.12**. It preserves the declared TypeScript/Workers major ranges. Node is **24.19.0**, npm **11.9.0**, Python **3.12.14**. `npm ci --ignore-scripts --no-audit --no-fund` used the reviewed lock; dependency lifecycle scripts were disabled. Exact versions and lock hashes are in runtime-versions.json. Checkout's `npm run check` and build use its own dependencies. Cross-repository builds explicitly use that declared esbuild; they do not assume the sibling platform's TypeScript/Workers types.

## Final executed chain

All application tests ran with cleared environment, synthetic credentials, temporary storage and denied/stubbed outbound network. Counts overlap and are not additive.

| Check | Result |
|---|---|
| Supplied reviewer invariants, corrected storage assertion | 3/3 pass |
| Expanded guard/retry/concurrency/restart/failure tests | 21/21 pass |
| Checkout normal `npm run check` (own tsc + entire suite) | 43/43 pass, typecheck pass |
| Checkout own non-deploying build | pass |
| BHC required receptionist suite | 288/288 pass |
| BHC focused commerce/legacy callbacks/foundation | 84/84 pass |
| BHC full applicable Node suite, available sparse checkout | 584/588; exit 1 |
| Existing BHC Python migration tests | 7/7 pass |
| Platform own security check | 5/5 pass |
| Actual signed BHC adapter → corrected Checkout + contract fingerprints | 2/2 pass |
| Local Checkout/platform/BHC commerce bundles | pass |
| Base-to-candidate whitespace checks | pass |

The final runner exits 1 when the full BHC suite fails; it does not convert a red gate into success. Bundle/patch/hash and scope results are generated separately after final commits.

## Exact remaining gaps

1. No complete authorized native clone/worktree is available here. A fresh noninteractive `git ls-remote` failed for missing GitHub credentials; /mnt has no mounted native environment. The authorized GitHub binary-blob read also returned UTF-8-only rejection. No login, credential setup, tunnel, WSL workaround or substitute implementation was attempted. BHC still has 196 unavailable unchanged binary blobs and the repositories retain their disclosed shallow base ancestry.
2. Consequently, the required complete-environment original-baseline/candidate rerun and full-history/asset integrity evidence remain unexecuted. Four failures remain in the available full candidate suite: Microstore class expectations, its undefined html variable, missing Switchboard screenshot bytes, and a Switchboard image-path assertion. Initial baseline logs show the same failures, but do not establish which remain with a complete checkout. The handoff's conditional test-only amendment was not exercised without that evidence. Neither tests nor marketing HTML/CSS/images were changed to manufacture green. No visual/browser acceptance is claimed.
3. Live cutover remains unexecuted: new guard binding/inventory, historical ownership mappings and other Checkout consumer migration need separately authorized coordination. No real automated adapter, billing lifecycle, merchant onboarding, financial ledger or provider activity is completed by this correction.

The package preserves the completed safe correction rather than restarting the foundation. No push, PR, merge, deployment, remote migration, Cloudflare mutation, credential change, live/test provider transaction, message, invitation or sales activation occurred.

## Primary semantics checked

- D1 primary reads and atomic SQL/batches: https://developers.cloudflare.com/d1/worker-api/d1-database/
- KV negative caching/eventual consistency: https://developers.cloudflare.com/kv/concepts/how-kv-works/
- Original-response idempotent replay and provider key lifetime: https://docs.stripe.com/api/idempotent_requests

These references support implementation assumptions; the local before/after logs establish the observed correction behavior.
