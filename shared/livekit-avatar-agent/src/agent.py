"""Shared Black Hole LiveKit avatar runtime."""

from __future__ import annotations

import json
import logging
import os
import pathlib
from urllib.parse import quote

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentServer, AgentSession, TurnHandlingOptions, inference, room_io
from livekit.plugins import lemonslice, noise_cancellation

from livekit_tts import EilaRuntimeTTS

APP_ROOT = pathlib.Path(__file__).resolve().parents[1]
load_dotenv(APP_ROOT / ".env.local")
load_dotenv(APP_ROOT / ".env")

logger = logging.getLogger("blackhole.avatar")
AGENT_NAME = os.getenv("AGENT_NAME", "blackhole-avatar").strip() or "blackhole-avatar"
AGENT_HTTP_PORT = int(os.getenv("AGENT_HTTP_PORT", "8082"))
RELAY_BASE_URL = os.getenv(
    "BLACKHOLE_VIDEO_RELAY_URL",
    "https://blackhole-video-worker.cryptocapitalgroupfl.workers.dev/internal/lemonslice/sessions",
).strip()


class Assistant(Agent):
    def __init__(self, instructions: str) -> None:
        super().__init__(instructions=instructions)


def required(data: dict, key: str) -> str:
    value = str(data.get(key) or "").strip()
    if not value:
        raise RuntimeError(f"Missing required dispatch metadata: {key}")
    return value


def metadata_for(ctx: agents.JobContext) -> dict:
    if not ctx.job.metadata:
        raise RuntimeError("Dispatch metadata is required")
    try:
        data = json.loads(ctx.job.metadata)
    except Exception as exc:
        raise RuntimeError("Invalid dispatch metadata JSON") from exc
    if not isinstance(data, dict):
        raise RuntimeError("Dispatch metadata must be an object")
    return data


def avatar_options(metadata: dict) -> dict:
    tenant_id = required(metadata, "tenant_id")
    provider = required(metadata, "avatar_provider").lower()
    source = required(metadata, "avatar_source").lower()
    if provider != "lemonslice":
        raise RuntimeError(f"Unsupported avatar_provider: {provider}")

    if source == "agent-id":
        value = required(metadata, "lemonslice_agent_id")
        logger.info("AVATAR_SOURCE tenant_id=%s source=agent-id", tenant_id)
        return {"agent_id": value}
    if source == "image-url":
        value = required(metadata, "avatar_image_url")
        logger.info("AVATAR_SOURCE tenant_id=%s source=image-url", tenant_id)
        return {"agent_image_url": value}

    raise RuntimeError(f"Unsupported avatar_source: {source}")


def build_tts(metadata: dict):
    tenant_id = required(metadata, "tenant_id")
    provider = required(metadata, "voice_provider").lower()
    voice = required(metadata, "voice_id")

    if provider == "livekit-inference":
        model = required(metadata, "voice_model")
        logger.info(
            "TTS_SOURCE tenant_id=%s provider=livekit-inference model=%s voice=%s",
            tenant_id,
            model,
            voice,
        )
        return inference.TTS(model=model, voice=voice, language="en")

    if provider == "eila-runtime":
        logger.info(
            "TTS_SOURCE tenant_id=%s provider=eila-runtime voice=%s",
            tenant_id,
            voice,
        )
        return EilaRuntimeTTS(voice_id=voice)

    raise RuntimeError(f"Unsupported voice_provider: {provider}")


server = AgentServer(port=AGENT_HTTP_PORT)


@server.rtc_session(agent_name=AGENT_NAME)
async def blackhole_avatar_agent(ctx: agents.JobContext) -> None:
    metadata = metadata_for(ctx)
    tenant_id = required(metadata, "tenant_id")
    creator_name = required(metadata, "creator_name")
    instructions = required(metadata, "instructions")
    relay_room = required(metadata, "relay_room")
    relay_token = required(metadata, "relay_token")

    session = AgentSession(
        llm=inference.LLM(model=os.getenv("LIVEKIT_LLM_MODEL", "openai/gpt-4o-mini")),
        stt=inference.STT(model=os.getenv("LIVEKIT_STT_MODEL", "deepgram/nova-3"), language="en"),
        tts=build_tts(metadata),
        turn_handling=TurnHandlingOptions(
            turn_detection=inference.TurnDetector(),
            endpointing={"mode": "dynamic", "min_delay": 0.25, "max_delay": 1.2, "alpha": 0.65},
            interruption={"mode": "adaptive", "min_duration": 0.7, "min_words": 1, "resume_false_interruption": False},
            preemptive_generation={"preemptive_tts": True},
        ),
    )

    await ctx.connect()

    separator = "&" if "?" in RELAY_BASE_URL else "?"
    relay_url = (
        f"{RELAY_BASE_URL}{separator}tenant={quote(tenant_id)}"
        f"&room={quote(relay_room)}"
    )

    avatar = lemonslice.AvatarSession(
        **avatar_options(metadata),
        agent_prompt=str(metadata.get("avatar_prompt") or "a person talking").strip(),
        agent_idle_prompt=str(metadata.get("avatar_idle_prompt") or "a person listening").strip(),
        api_url=relay_url,
        api_key=relay_token,
    )

    logger.info("RELAY_START tenant_id=%s room=%s", tenant_id, relay_room)
    await avatar.start(session, room=ctx.room)
    logger.info("RELAY_CONNECTED tenant_id=%s room=%s", tenant_id, relay_room)

    room_options = room_io.RoomOptions(
        audio_input=room_io.AudioInputOptions(noise_cancellation=noise_cancellation.BVC()),
        audio_output=False,
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(instructions=instructions),
        room_options=room_options,
    )

    await avatar.wait_for_join()
    logger.info("AVATAR_JOINED tenant_id=%s room=%s", tenant_id, relay_room)
    await session.generate_reply(
        instructions=f"Greet the user naturally as {creator_name}. Keep it brief and stay in character.",
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
