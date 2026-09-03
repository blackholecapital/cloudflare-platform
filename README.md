# cloudflare-platform

Generic Cloudflare infrastructure, bootstrap, inventory, and control-plane resources for Blackhole systems.

## Ownership boundary

This repository does **not** own or deploy the shared video relay, any tenant application, a model, voice engine, avatar agent, Windows service, or local runtime.

The shared LiveKit room/dispatch relay is independently owned by [blackholecapital/blackhole-video-worker](https://github.com/blackholecapital/blackhole-video-worker). Tenant repositories own their adapters and assets. `EILA-Overwatch` owns the shared Windows execution plane.

Do not add `blackhole-video-worker` source, Wrangler configuration, Secrets Store deployment, tests, or deployment scripts back into this repository.
