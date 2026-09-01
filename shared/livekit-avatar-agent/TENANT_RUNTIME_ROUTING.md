# Tenant-specific EILA runtime routing

The shared `blackhole-avatar` LiveKit agent can now choose a TTS runtime per video tenant without changing the existing fallback behavior.

EILA Overwatch uses its tenant-local private runtime:

```bash
BLACKHOLE_EILA_OVERWATCH_RUNTIME_URL=<local EILA runtime URL>
BLACKHOLE_EILA_OVERWATCH_RUNTIME_TOKEN=<EILA runtime token>
```

Buddy production now uses `livekit-inference` voice metadata on this shared
adapter, matching AI Fans. It does not require `buddy-voice.xyz-labs.xyz` or a
dedicated `buddys-avatar` process to open a video room. The former Buddy runtime
variables remain supported only as an explicit rollback path.

Tenant IDs are upper-cased and non-alphanumeric characters become `_`, so `eila-overwatch` maps to `EILA_OVERWATCH`.

If no tenant-specific variables are set, `EilaRuntimeTTS` keeps using its existing fallback order (`EILA_RUNTIME_*`, `BUDDY_RUNTIME_*`, `AI_FANS_RUNTIME_*`). This keeps current Buddy deployments backward-compatible.
