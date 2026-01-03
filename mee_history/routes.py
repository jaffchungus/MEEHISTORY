from flask import Blueprint, render_template

from .services.characters import get_character


main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    """Home route – automatically starts a call with Albert Einstein."""
    character_id = "einstein"
    character = get_character(character_id)
    return render_template(
        "index.html",
        character_id=character_id,
        character=character,
    )
