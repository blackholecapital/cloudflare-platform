# Cloudflare edge relay deployment boundary

> **MANDATORY — READ BEFORE CHANGING OR DEPLOYING THIS REPOSITORY.**

This repository is an edge relay only. It may authenticate a trusted tenant adapter, create a LiveKit dispatch, and relay a provider request. It does not own an assistant, tenant, model, voice engine, avatar agent, local runtime, tunnel origin, or Windows/WSL service.

## Allowed

- Maintain and deploy only `blackhole-video-worker` and generic Cloudflare infrastructure owned here.
- Bind the one trusted demo-plane capability credential without reading or rotating its value.
- Forward tenant metadata such as tenant ID, assistant ID, avatar asset, voice ID, and prompt without interpreting it as executable platform configuration.
- Use `blackholecapital/AI-Agent-Command-Center` as the architecture authority and `blackholecapital/EILA-Overwatch` as the current local execution owner.

## Forbidden

- Do not add LLM, TTS, voice, avatar, GPU, LiveKit agent, Windows, WSL, Ollama, Chatterbox, or tenant application code.
- Do not add tenant-specific capability aliases or require a platform commit to onboard a trusted demo tenant.
- Do not deploy a tenant repository or the local execution plane from this repository.
- Do not copy runtime code from EILA Overwatch or another product.

The fixed boundary is: `tenant adapter -> blackhole-video-worker -> LiveKit dispatch`. Everything after the dispatch runs on the EILA-owned local execution plane.
