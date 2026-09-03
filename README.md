# cloudflare-platform

Cloudflare edge relay for Blackhole demonstration assistants. This repository does not contain or run a model, voice engine, avatar agent, Windows service, or tenant application.

## Demo-plane capability boundary

The current demo plane intentionally uses one centralized capability secret for every trusted tenant adapter. Tenant IDs select routing, avatar, persona, and voice; they are not a cryptographic security boundary. Repository isolation is enforced through deployment ownership: this repository deploys only `blackhole-video-worker`, while tenant repositories deploy only their adapters and assets. The EILA Overwatch repository owns the one local Windows execution plane.

`blackhole-video-worker` is a generic pass-through: it validates the plane credential, creates a LiveKit dispatch for `blackhole-avatar`, and relays LemonSlice requests. It never executes LLM or TTS inference. Adding a trusted demo tenant must not require a new capability binding or a code change here.

Before admitting untrusted tenant operators or production multi-tenant traffic, replace the shared capability with distinct Secrets Store entries per tenant and remove the generic `BLACKHOLE_CAPABILITY_TOKEN` fallback.
