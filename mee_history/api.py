from __future__ import annotations

from http import HTTPStatus

from flask import Blueprint, current_app, jsonify, request

from .services.characters import get_character
from .services.gemini_client import GeminiClient


api_bp = Blueprint("api", __name__)


def _get_gemini_client() -> GeminiClient:
    api_key = "AIzaSyAGj8To5dBTTm75pd37cP_BlXECsHw7n9A"
    model_name = "gemini-3-pro"
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. Set it in your environment before starting the server."
        )
    return GeminiClient(api_key=api_key, model_name=model_name)


@api_bp.route("/ask", methods=["POST"])
def ask():
    """Text-based question endpoint backed by Gemini.

    Expects JSON of the form:
    {
        "message": "...",            # required
        "character_id": "einstein",  # optional, defaults to Einstein
        "history": [                  # optional list of {role, content}
            {"role": "user", "content": "Hi"},
            {"role": "assistant", "content": "Hello"},
        ]
    }
    """
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    character_id = data.get("character_id", "einstein")
    history = data.get("history") or []

    if not message:
        return jsonify({"error": "message is required"}), HTTPStatus.BAD_REQUEST

    character = get_character(character_id)
    if not character:
        return (
            jsonify({"error": f"Unknown character_id '{character_id}'"}),
            HTTPStatus.BAD_REQUEST,
        )

    try:
        client = _get_gemini_client()
    except RuntimeError as exc:  # missing API key, etc.
        current_app.logger.error("Gemini configuration error: %s", exc)
        return (
            jsonify({"error": str(exc)}),
            HTTPStatus.INTERNAL_SERVER_ERROR,
        )

    try:
        reply_text = client.generate_reply(
            character=character,
            history=history,
            user_message=message,
        )
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Gemini generation failed")
        return (
            jsonify({"error": "Failed to generate response from Gemini", "details": str(exc)}),
            HTTPStatus.INTERNAL_SERVER_ERROR,
        )

    return jsonify({"reply": reply_text})
