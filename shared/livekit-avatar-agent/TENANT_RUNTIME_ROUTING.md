# Tenant-specific EILA runtime routing

The shared `blackhole-avatar` LiveKit agent can now choose a TTS runtime per video tenant without changing the existing fallback behavior.

For Buddy and EILA Overwatch on the same home avatar service, set:

```bash
BLACKHOLE_BUDDYS_RUNTIME_URL=https://buddy-voice.xyz-labs.xyz
BLACKHOLE_BUDDYS_RUNTIME_TOKEN=<buddy runtime token>

BLACKHOLE_EILA_OVERWATCH_RUNTIME_URL=https://alley-voice.xyz-labs.xyz
BLACKHOLE_EILA_OVERWATCH_RUNTIME_TOKEN=<EILA runtime token>
```

Tenant IDs are upper-cased and non-alphanumeric characters become `_`, so `eila-overwatch` maps to `EILA_OVERWATCH`.

If no tenant-specific variables are set, `EilaRuntimeTTS` keeps using its existing fallback order (`EILA_RUNTIME_*`, `BUDDY_RUNTIME_*`, `AI_FANS_RUNTIME_*`). This keeps current Buddy deployments backward-compatible.
