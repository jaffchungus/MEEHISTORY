import os


class Config:
    """Base configuration for the MEEHISTORY Flask app."""

    # Flask / security
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")

    # Gemini configuration
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    # You can override this with e.g. "gemini-3.0-pro" when available
    GEMINI_MODEL_NAME = os.environ.get("GEMINI_MODEL_NAME", "gemini-1.5-pro")

    # General
    DEBUG = os.environ.get("FLASK_DEBUG") == "1"
