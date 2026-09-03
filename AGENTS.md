# Cloudflare platform ownership boundary

> **MANDATORY — READ BEFORE CHANGING OR DEPLOYING THIS REPOSITORY.**

This repository owns generic Cloudflare infrastructure, bootstrap, inventory, and control-plane resources only.

## Allowed

- Maintain generic Cloudflare infrastructure and platform control-plane resources already declared here.
- Use product and runtime repositories as read-only architectural references.
- Preserve explicit resource ownership boundaries.

## Forbidden

- Do not add, maintain, or deploy `blackhole-video-worker` from this repository. Its sole owner is `blackholecapital/blackhole-video-worker`.
- Do not add a tenant application, tenant adapter, model, LLM, TTS, voice engine, avatar agent, GPU code, Windows/WSL service, tunnel origin, or local runtime.
- Do not deploy another repository from here.
- Do not copy shared relay or runtime code into this repository.

The fixed video boundary is external to this repository: `tenant adapter -> blackhole-video-worker -> LiveKit dispatch -> shared execution plane`.
