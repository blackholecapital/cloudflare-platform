# Pass 1 implementation report

**Correction checkpoint:** R1/R2/R3 now pass locally; Checkout uses a mandatory transactional D1 ownership guard and its own locked toolchain (43/43 tests). Complete source-checkout validation remains blocked. See [PASS1-CORRECTION-REPORT.md](PASS1-CORRECTION-REPORT.md) for authoritative current checkout behavior, before/after logs and remaining gaps. The initial implementation/validation record below is retained as history; its KV write path and companion-toolchain notes are superseded by that correction.

Status: **PASS 1 INCOMPLETE**. This is local implementation and validation, not release approval. Production is unchanged and may retain the audited exposures.

## Exact source and authority

The complete October 1 owner handoff was read before implementation. Shared tenancy supersedes per-customer/per-theme installation. Main was read through the authenticated GitHub connector and exactly matched all four supplied checkpoints:

| Repository | Actual pinned base | Local branch |
|---|---|---|
| BHC | 647ff91e0d2ab67ee77bb1b9df7c35468b74b438 | saas/pass1-platform-foundation |
| cloudflare-platform | 1f00389418ce8a6df8490d0bf50b8a1bc609a2d3 | saas/pass1-control-plane-security |
| Checkout-worker | 57802a78b3876c16ac043073da989e5ca531360a | saas/pass1-checkout-trust-boundary |
| PayMe-v3-Pro (read only) | d3ad919dcd52633bd6617c6dbd7816fa41b3d845 | none |

Native `git ls-remote` failed with `could not read Username ... terminal prompts disabled`; no credential changes, tunnel, login or alternative unauthorized connection was attempted. GitHub Git-data commits and trees plus 422 source files were retrieved read-only. Every materialized blob and reconstructed commit/tree was checked against its Git SHA. Local repositories have exact base commits, shallow ancestry at that base, and origin/main fixed to that base. BHC is sparse: 196 unchanged binary blobs were unavailable from the text-only connector. Missing files were marked skip-worktree; no placeholders or replacement images were invented. This is not evidence of a successful native clone/fetch or a complete BHC checkout. The source-metadata delivery files disclose this limitation.

Fresh isolated directories were used; no shared checkout was edited. BHC AGENTS.md, blackhole-runtime/RUNTIME-BOUNDARY.md and platform AGENTS.md were read. The owner explicitly authorized the narrow platform work separately. PayMe worker, docs/cloudflare.md, package.json and legacy USDC verifier were read; none was edited or mounted. Open PRs inspected: BHC #108 (overlapping PayMe handoff), #33 and #30 (Switchboard); platform #24/#23 (Windows wrappers); Checkout-worker #1 (Worker name). Branch lists were inspected. No unmerged branch was incorporated. Main was not automatically rebased during the pass.

## Implemented

- **A: privileged infrastructure API** — `cloudflare-platform/worker-api/src/index.js` and `security.js` now enforce central fail-closed operator/service authorization before privileged operations, including unknown aliases. Operators retain filtered, read-only legacy visibility; service credentials can only inspect explicitly configured target/product/environment scopes. Preview is bounded and unavailable for execution. Provision and tenant enrollment cannot reach the allocator, even if the legacy execution switch is accidentally enabled. Raw source export is closed because it can expose embedded credentials. Additive migration `003_deployment_targets.sql` stores targets, explicit ownership references and audit records. Target registration never connects an account and always starts inactive/unverified.
- **B: canonical persistence** — `BHC/migrations/store/0009_saas_foundation.sql`, `lib/saas/service.mjs` and `functions/api/commerce/[[path]].js` implement real D1-compatible persistence for verified identity bridges, organizations, memberships, products, immutable configurations/offer revisions, commercial reviews, orders/items, shared tenant instances, inactive entitlement snapshots, receipts and audit. Existing `STORE_DB` is the only canonical commerce database. Existing operator auth remains in BHC_LEADS_DB. Operator privilege is not tenant membership. Verified customer identity must have explicit membership; order email does not claim an organization or legacy order.
- **Atomicity and retries** — one STORE_DB batch contains receipt, conditional revision guards, related writes and audit. Scoped keys bind a canonical payload hash; exact retries return stable IDs and changed payloads conflict. Real SQLite execution tests concurrency, unique constraints, rollback and restart persistence. No cross-database or provider transaction is claimed.
- **Historical compatibility** — `lib/saas/legacy.mjs` is an explicit operator-run, bounded, keyset/checkpoint import for store_orders, lead_builder_orders, microstore_orders and venue_os_orders. Imports write canonical records only, uniquely map sources, preserve reported financial/session/configuration provenance, and remain unclaimed/review-required with no instance or access. PayMe's lead-style IDs and Studio versus Microstore Studio are distinguished. Existing legacy read/callback routes remain in place; the new operator compatibility read exposes imported provenance. No live cutover or automatic dual-write was introduced.
- **C: registry** — create, immutable configuration registration, version update and commercial review are operator protected. The four controls remain independent. `lib/saas/seed.mjs` supplies 27 source-referenced offers with **zero generated approvals**, including three unpriced Sniper membership tiers, private download descriptors and shared Microstore configuration entitlements. Gallery/Showroom are configurations of a shared instance; no infrastructure is allocated. Proposed PayMe amounts remain unapproved, and its public new-order handler is held for commercial review while signed legacy callbacks remain reachable. All new commercial/automation releases remain default-off. No real adapter is certified.
- **Approved facts** — deterministic projection validates through the unchanged current micro catalog validator, preserves existing price-display semantics and rejects existing price drift, unsupported billing intervals, route families and unpublished schema additions. Current website pages, prices, AI facts file and shared runtime code are unchanged. A later explicit consumer integration is required for genuinely new families/routes.
- **D: checkout trust** — `contracts/saas-v1.mjs`, Checkout `src/trust.mjs`, and BHC `lib/checkout-service.mjs` define the signed exact-body/method/route/caller/key/environment/time boundary. Both create and status are authenticated; browser origins/cookies are rejected internally. Unknown fields, destination overrides, bad scopes, absent/separate-key configuration and tampering fail before Stripe. BHC Lead, Microstore, Venue, Studio and PayMe server adapters use this boundary. Trusted caller/product configuration resolves callback/return URLs, and redirects are disabled on outbound calls. Existing mixed billing and payme-idempotent-v1 exact retry protections remain. HMAC-authenticated lost-response recovery persists a session binding before evaluating paid state. Status-only or unpaid lead callbacks and unbound/mismatched Studio callbacks cannot mark paid. Checkout webhooks require a matching stored checkout session and paid evidence; metadata destinations and invoice/subscription IDs cannot masquerade as checkout sessions.
- **E: versioned contracts** — canonical generic source is BHC `contracts/saas-v1.mjs`; byte-identical artifacts plus SOURCE.json are copied into the two narrowly authorized repos. Validators cover offer resolution/snapshots, service auth/context, normalized payment evidence, enrollment, handoff, inactive membership/download descriptors, targets and ownership. Fixture adapters return explicit unavailable with no URL. No product-specific installer or arbitrary-command executor was added.

## Baseline and initial-delivery validation (historical)

Runtime: Node v24.19.0, npm 11.9.0, Python 3.12.14, TypeScript 7.0.2, Workers types 5.20260730.1. Exact installed versions are also recorded in runtime-versions.json. BHC and platform dependencies were installed from their existing lockfiles with lifecycle scripts ignored. No Checkout-worker dependency resolution/upgrade was performed; typecheck/build used the locked companion platform toolchain. Node >=24 is now declared for Checkout's native TypeScript test execution.

All application tests run in an empty environment with synthetic credentials/temp databases and a preload denying outbound fetch/socket/HTTP unless explicitly stubbed. No provider, payment, model, mail or customer activity occurred. Build uses local esbuild, not a deployment command.

| Command group | Baseline | Final |
|---|---|---|
| BHC required `npm run check:micro-receptionist` | exit 0, 288/288 | exit 0, 288/288 |
| BHC all Node tests (including new tests in final) | exit 1, 564/571 | exit 1, 584/588 |
| Focused BHC commerce + foundation + regression | existing baseline included above | exit 0, 84/84 |
| Checkout existing/new tests | exit 0, 14/14 | exit 0, 19/19 |
| Platform package test | exit 1, existing no-tests placeholder | exit 0, 5/5 (with route/scope matrices) |
| Cross-repository conformance + actual signed adapter integration | new | exit 0, 2/2 |
| Existing Python catalog migration tests | final executed | exit 0, 7/7 |
| Checkout TypeScript | final executed | exit 0 |
| Local Checkout/platform/commerce bundles | final executed | exit 0 |
| Three `git diff --check` checks | final executed | exit 0 |

Counts overlap; they must not be summed as unique tests. The first security regressions demonstrated unsigned checkout/provider access and anonymous platform state access in the original code. Corrected `payment-defect-before.log` independently demonstrates the original status-only lead payment defect, then `payment-focused.log` demonstrates its fix. An earlier combined defect log included a syntax error in the initial payment test; it is not payment-defect evidence. Focused intermediate failures were corrected, and the final complete chain was rerun after source changes. No assertions were changed to accept anonymous access, fake payment or weakened recovery.

Reproducible commands, sanitized logs, exit codes, source metadata and actual base/head/tree/contract hashes are in the external delivery package. The final hash manifest is generated **after** final commits, avoiding a self-invalidating committed HEAD claim.

## Remaining gaps preventing READY

1. Full BHC validation remains red on four pre-existing presentation tests: `tests/microstore-showcase.test.mjs` expects removed `ms-shot-*` classes; its rotation test refers to undefined `html`; `tests/switchboard-showcase.test.mjs` cannot read missing binary screenshot files; its allowed-image assertion rejects an existing image outside `/assets/flagship/switchboard/`. The same four failures were present in the baseline. No marketing source or unrelated presentation assertion was changed to force a pass.
2. Native authenticated clone/fetch, complete BHC binary checkout and full source/asset integrity verification are unavailable here. Incremental bundles are verified for the delivered changes against the exact prerequisite bases; they do not include unavailable binary assets or full historical ancestry. Revalidation must occur in a complete authorized clone. No browser/visual validation is claimed.
3. Other existing Checkout-worker consumers cannot be assumed migrated. Its README documents a Gallery/browser-oriented client; the original contract also allowed arbitrary clients. Owner-scoped code search returned no additional matches and is not exhaustive consumer inventory. No downstream repo was modified. New service credentials, trusted route maps and legacy stored-row context adoption must be coordinated during a separately authorized staged rollout; no anonymous compatibility fallback exists.

Pass 2 has not started. No push, PR, merge, remote migration, deployment, Cloudflare mutation, live provider activity, invitations/messages, credential change or sales activation occurred. Do not call these candidates production-ready.
