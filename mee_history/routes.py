from flask import Blueprint, render_template, request

from .services.characters import get_character, list_characters


main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    """Home route – automatically starts a call with a selected character.

    Defaults to Albert Einstein, but a different figure can be chosen via the
    "character_id" query parameter.
    """
    character_id = request.args.get("character_id", "einstein")
    character = get_character(character_id) or get_character("einstein")

    all_characters = list_characters()

    return render_template(
        "index.html",
        character_id=character.id if character else "einstein",
        character=character,
        characters=all_characters,
    )
