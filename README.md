# cloudflare-platform

Shared platform infrastructure for Blackhole demonstration assistants.

## Demo-plane capability boundary

The current demo plane intentionally uses one centralized capability secret for every trusted tenant adapter. Tenant IDs select routing, avatar, persona, and voice; they are not a cryptographic security boundary. Repository isolation is enforced through deployment ownership: only this repository deploys `blackhole-video-worker`, while tenant repositories deploy only their adapters and assets.

Before admitting untrusted tenant operators or production multi-tenant traffic, replace the shared capability with distinct Secrets Store entries per tenant and remove the generic `BLACKHOLE_CAPABILITY_TOKEN` fallback.
