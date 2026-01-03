import os


class Config:
    """Base configuration for the MEEHISTORY Flask app."""

    # Flask / security
    # For development, auto-generate a secret key at process start instead of
    # relying on environment variables.
    SECRET_KEY = os.urandom(32)

    # Gemini configuration (kept environment-based to avoid hard-coding API keys)
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    # You can override this with the exact Gemini 3 Pro model name you intend
    # to use, e.g. "gemini-3.0-pro". The default here is just a placeholder.
    GEMINI_MODEL_NAME = os.environ.get("GEMINI_MODEL_NAME", "gemini-3.0-pro")

    # General
    DEBUG = os.environ.get("FLASK_DEBUG") == "1"
