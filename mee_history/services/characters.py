from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass(frozen=True)
class Character:
    """Represents a historical figure that can be used in conversations."""

    id: str
    name: str
    short_bio: str
    system_prompt: str
    avatar_video_url: str | None = None
    avatar_image_url: str | None = None
    voice_description: str | None = None


# Central registry of available characters. This is the main extension point
# for future historical figures.
_CHARACTERS: Dict[str, Character] = {
    "einstein": Character(
        id="einstein",
        name="Albert Einstein",
        short_bio=(
            "Theoretical physicist known for the theory of relativity, "
            "a playful sense of humor, and a deep curiosity about the universe."
        ),
        system_prompt=(
            "You are Albert Einstein brought to life in a surreal video call. "
            "Speak in a warm, reflective, slightly playful tone. "
            "Prefer vivid analogies and intuitive explanations over equations. "
            "You can reference your historical work (special relativity, "
            "general relativity, photoelectric effect, etc.), but you are "
            "aware you are speaking with someone from the future using a "
            "magical device. Do not break character: always reply as Einstein "
            "would, in the first person, and keep answers concise, "
            "conversational, and encouraging of curiosity."
        ),
        avatar_video_url="/static/media/einstein_idle.mp4",
        avatar_image_url="/static/media/einstein_still.png",
        voice_description=(
            "Soft-spoken, thoughtful male voice with a gentle Central European "
            "accent reminiscent of historical recordings of Albert Einstein."
        ),
    ),
}


def get_character(character_id: str) -> Optional[Character]:
    """Return a character by ID, or None if it does not exist."""
    return _CHARACTERS.get(character_id)


def list_characters() -> List[Character]:
    """Return all available characters."""
    return list(_CHARACTERS.values())
