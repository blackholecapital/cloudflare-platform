# SaaS contracts v1

Version: `bhc-saas-v1`. Checkout envelope: `bhc-checkout-auth-v1`. Retry contract remains `payme-idempotent-v1`. Canonical code: BHC/contracts/saas-v1.mjs; SOURCE.json hashes must match all delivered copies.

## Ownership and storage

BHC owns offers/order identity and orchestration. Canonical records live only in existing STORE_DB using migrations/store/0009_saas_foundation.sql. Existing STORE_DB magic-link sessions are read and explicitly bridged to a random saas_users ID using a server-hashed verified identity subject. No order email, company name, slug, request header or query grants membership. Only an authenticated owner can create organizations/memberships, and member creation requires an existing verified canonical user. Guests remain unclaimed. Existing operator authentication remains BHC_LEADS_DB and confers inspection privilege, not membership.

PayMe owns payment authority; customer merchant receipts are distinct from BHC platform subscription revenue. Cloudflare platform owns generic targets/ownership only. Products own application data, bootstrap and adapters. Neither BHC nor platform deploys another repository. Product instances are shared-tenant enrollments with random IDs, not Workers/Pages projects or per-buyer storage resources. Future production account/distribution references are inert metadata.

## API and authorization

BHC `/api/commerce/[[path]]`: GET orders, orders/:id, instances, instances/:id, instances/:id/configurations/:configurationId, instances/:id/descriptors. Customer access is membership-scoped; operator access is separately authenticated. GET offers/:offerId/:revision and legacy/:source/:sourceId are operator only. No query-parameter identity filters are accepted.

POST identity bridges a verified customer session and grants no organization. POST organizations, memberships, products, configurations, offers, reviews, registry-seed and legacy-import are operator-only; POST orders requires membership or an operator-created unclaimed buyer. Same-origin mutation, JSON size bound and Idempotency-Key apply. Owner/customer login/session/logout are reused unchanged. Browser payment-evidence ingestion is always rejected; future internal ingestion needs a separate authenticated implementation.

Registry writes require exact schemas. Offer save includes expected revision. Review targets the current immutable version and records actor/evidence. New versions do not inherit approval. Product/configuration IDs are stable and configurations immutable. Prices use integer minor units; setup versus recurring and historical billing-start policy are explicitly snapshotted. Order items persist the reviewed offer, selected configuration definitions and approval/policy references. New canonical orders can be pending while payment release remains disabled; this is not a payable request.

Scopes are verified actor + organization/product/operation as applicable. Each idempotency key binds normalized JSON SHA-256. The receipt, guarded revision writes, domain records and audit commit in one D1 batch. A batch is not a transaction across the operator DB, legacy DB, Stripe or email. No outbox or lifecycle engine is claimed.

## Independent controls and effective eligibility

Sales: unpublished / quote_only / purchasable. Fulfillment: white_glove / automated. Delivery: hosted_workspace / membership / download. Setup assistance: included / optional_paid_upgrade. White-glove is a normal mode; optional paid setup requires a separate approved offer.

Effective checkout also requires approval, nonempty approved price, compatible payment contract, server-enabled release policy and the applicable fulfillment prerequisites. New server gates are absent/default-off: SAAS_COMMERCIAL_CUTOVER, SAAS_PAYMENT_CONTRACT, SAAS_RELEASE_POLICY, SAAS_WHITE_GLOVE_CHECKLIST, SAAS_AUTOMATION_RELEASE. Automation always returns adapter_not_implemented in this pass. Saved preferences survive capability outages. A client ready/approved/paid field is invalid. Seeds create no reviews/approvals. Seed metadata does not establish commercial authority.

Microstore versions list permitted configuration IDs and maxConfigurations per offer; selections never allocate infrastructure. Studio/Creators Lab descriptors point to versioned private artifact/document references. No bucket listing, public permission, signed download URL, redemption token or access URL is produced. Sniper has three named configurable tiers with empty prices. Quote/unpublished closures are preserved. Public site prices/catalog are not cut over.

## State and adapters

Order payment: draft/pending/review_required only. Fulfillment: pending/review_required. Access/desired entitlements: inactive only. Notification: not_requested only. Original legacy paid/status labels are provenance, never newly verified settlement.

Enrollment carries version, operation=tenant_enrollment, organizationId, instanceId, orderId, productId, configurations, revision, adapterVersion, targetId (nullable), idempotencyKey and inactive entitlement state. Handoff carries the same identities plus inputSchema/checklistRef and pending/review_required. Access descriptors contain kind and inactive configuration/artifact metadata. Unimplemented adapter returns available=false, adapter_not_implemented and the instance ID; no ready URL.

Payment evidence schema contains event/order/session/provider/merchant reference, platform_subscription money flow, minor units/currency, state and timestamp. Validating a shape is not authenticating or ingesting it. No public endpoint can use this schema to change state.

## Checkout server boundary

HMAC-SHA256 signs newline-separated contract, method, exact path+query, caller, key ID, environment, timestamp, expiry and exact body bytes. Lifetime is at most 120 seconds with 15 seconds future clock tolerance. Worker authenticates independently of CORS and denies Origin/Cookie requests. BHC environment references: CHECKOUT_SIGNING_SECRET, CHECKOUT_CALLER, CHECKOUT_KEY_ID, CHECKOUT_ENVIRONMENT. This key must differ from callback/provider keys.

Worker CHECKOUT_CALLERS is server-owned caller metadata: keyId, secretRef (environment binding name), environment, and product route records with sourceApp/successUrl/cancelUrl/callbackUrl. `{offerId}` substitution is allowed only in a configured template and encoded. No keys or private price catalog belong in browser files or route-map JSON. `_trust` carries stable order/offer/version/product/configuration/money-flow context and is not forwarded to Stripe metadata, preserving the existing recovery form. Unknown/extra authority fields fail closed. Legacy recovery retains the same Stripe idempotency key and form for exact repeats. Service status reads must be signed and scoped; explicitly enabling legacyStatus permits only the trusted caller's staged legacy lookup, requiring operator review of its scope first.

Callbacks resolve from server configuration and persisted caller/product/environment context, never Stripe metadata callback_url. Existing rows lacking trusted context remain review-required for callback routing until an explicit later adoption map is verified. Signed callback fixtures with established context and bound sessions pass. Invoice/subscription lifecycle events are not checkout-session evidence and are held for Pass 2. No subscription ledger, renewal/refund/cancellation engine, merchant onboarding or additional rail is implemented.

## Generic platform

OPS_API_TOKEN grants operator-wide inspection. Scoped internal credentials reference server-side secrets and explicit operations/targetIds/productIds/environment. PLATFORM_TARGET_SCOPES adds a server-owned target-to-product/environment pre-read check. Customer cookies grant no platform authority. Targets use opaque UUIDs, provider, accountRef, environment/purpose, verification, active and credentialRef; registration starts unverified/inactive and requires an already-declared account reference. Resource ownership has target/product plus optional organization/instance references. Legacy resources remain unadopted. No claim supplied in JSON authorizes provider resource adoption.

`/api/provision` is unavailable under the default-off LEGACY_PROVISION_EXECUTION gate and remains unavailable even if flipped, because allocator acceptance has not occurred. `/api/preview` only returns a bounded unavailable summary. `/api/tenant-enrollment` returns product_adapter_required; it cannot invoke that allocator. Source export is unavailable. Errors are sanitized with correlation IDs.

## Checkout guard correction (authoritative for the corrected candidate)

The public signature and recovery versions above remain unchanged. Internal persistence is checkout-guard-v1, in a required CHECKOUT_GUARD D1 binding owned by Checkout. Canonical BHC commerce still resides in STORE_DB. The guard stores immutable caller/environment/product/offer/version/configuration context and request/form fingerprint under the existing checkout ID. Database constraints prevent owner/session reassignment, ID reuse and paid downgrades. It is a shared database of records, never customer-specific infrastructure.

CHECKOUT_STATUS is now read-only historical evidence. Missing guard configuration or an unverified complete legacy identity inventory fails closed; migration 0001 starts blocked. New create responses and exact replays retain checkout_id, stripe_session_id and redirect_url and add current status/payment_status. A paid replay returns the original tuple and paid state without another provider POST. Matching in-flight creates may return 503 and retry the same identity; changed owner/context/payload returns 409 before provider work. Legacy uncertain calls without a provider key require review; keyed retries keep payme:<checkout_id> and the 23-hour window.

Supported checkout events awaiting their session binding or callback authority/delivery return 503. They are not acknowledged as retained review work. Unsupported lifecycle events and definitively mismatched bindings return an explicit ignored result and do not change payment. Valid unpaid completion remains pending. Valid duplicate delivery is at-least-once; the current bound monotonic state is sent to the configured destination. The guard is not a financial ledger or event/outbox implementation. Full correction semantics and executable evidence are in PASS1-CORRECTION-REPORT.md.
