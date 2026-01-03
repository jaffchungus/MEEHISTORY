from __future__ import annotations

from flask import Flask

from .config import Config
from .routes import main_bp
from .api import api_bp


def create_app(config_class: type[Config] = Config) -> Flask:
    """Application factory for the MEEHISTORY Flask app."""
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config.from_object(config_class)

    # Register blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix="/api")

    return app
