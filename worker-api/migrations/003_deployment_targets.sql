-- Additive. Legacy customers/resources remain unadopted and unchanged.
CREATE TABLE IF NOT EXISTS deployment_targets (
 id TEXT PRIMARY KEY, provider TEXT NOT NULL CHECK(provider='cloudflare'),
 account_ref TEXT NOT NULL, environment TEXT NOT NULL CHECK(environment IN ('development','staging','production')),
 purpose TEXT NOT NULL CHECK(purpose IN ('shared_product','customer_production','distribution')),
 credential_ref TEXT NOT NULL, product_id TEXT NOT NULL,
 verification TEXT NOT NULL DEFAULT 'unverified' CHECK(verification IN ('unverified','verified')),
 active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)),
 CHECK(active=0 OR verification='verified')
);
CREATE TABLE IF NOT EXISTS resource_ownership (
 id TEXT PRIMARY KEY, target_id TEXT NOT NULL REFERENCES deployment_targets(id),
 product_id TEXT NOT NULL, organization_id TEXT, instance_id TEXT,
 provider_resource_id TEXT NOT NULL, resource_type TEXT NOT NULL,
 UNIQUE(target_id,resource_type,provider_resource_id)
);
CREATE TABLE IF NOT EXISTS platform_audit (
 id TEXT PRIMARY KEY, action TEXT NOT NULL, target_id TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
