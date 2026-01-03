from __future__ import annotations

from typing import Any, Dict, List, Mapping, Sequence

import google.generativeai as genai

from .characters import Character


def _map_role(role: str) -> str:
    """Map generic chat roles to Gemini roles."""
    if role == "assistant":
        return "model"
    return "user"


class GeminiClient:
    """Thin wrapper around the Gemini client for character-based replies."""

    def __init__(self, api_key: str, model_name: str) -> None:
        if not api_key:
            raise ValueError("api_key is required for GeminiClient")
        self._api_key = api_key
        self._model_name = model_name

        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel(model_name=model_name)

    def _build_system_message(self, character: Character) -> str:
        return (
            f"You are {character.name}, appearing in a surreal but friendly "
            f"video call. Stay strictly in character. "
            f"Bio: {character.short_bio}. "
            f"Voice and style: {character.voice_description or 'speak clearly and warmly.'} "
            f"Additional instructions: {character.system_prompt}"
        )

    def generate_reply(
        self,
        character: Character,
        history: Sequence[Mapping[str, Any]],
        user_message: str,
    ) -> str:
        """Generate a character-specific reply for the user_message.

        history is a sequence of dicts with keys:
            - role: 'user' or 'assistant'
            - content: text content
        """
        system_text = self._build_system_message(character)

        contents: List[Dict[str, Any]] = []

        # System-style instruction as an initial user message for the model.
        contents.append({"role": "user", "parts": [system_text]})

        for item in history:
            role = _map_role(str(item.get("role", "user")))
            content = str(item.get("content", "")).strip()
            if not content:
                continue
            contents.append({"role": role, "parts": [content]})

        contents.append({"role": "user", "parts": [user_message]})

        response = self._model.generate_content(contents)

        text = getattr(response, "text", None)
        if not text and getattr(response, "candidates", None):
            candidate = response.candidates[0]
            try:
                parts = candidate.content.parts
                if parts:
                    text = parts[0].text
            except Exception:  # noqa: BLE001
                text = None

        if not text:
            raise RuntimeError("Gemini response did not contain any text.")

        return text.strip()
