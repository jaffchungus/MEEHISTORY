# MEEHISTORY – Surreal video calls with Albert Einstein

MEEHISTORY is a Python Flask application that creates a surreal, video call–like
experience with historical figures, starting with **Albert Einstein**.

The app uses:

- **Flask** to serve a clean, login-free web interface.
- **WebRTC getUserMedia** to stream your camera and microphone into the page so
  it feels like a live call.
- **Gemini** (via the `google-generativeai` client) to generate Einstein's text
  responses.
- **Web Speech API** (in the browser) to speak Einstein's replies using an
  approximate synthetic voice.

The architecture is designed so you can later plug in a high-fidelity talking
head / voice service for Einstein and additional historical figures.

---

## Features

- **Auto-start call**
  - Visiting `/` immediately requests camera/mic access and starts a call with
    Albert Einstein—no login or signup.

- **Real-time video experience**
  - Uses `navigator.mediaDevices.getUserMedia` (WebRTC media capture) to show
    your live video stream.
  - A dedicated tile shows Einstein's avatar (video or image) with a subtle
    "speaking" animation when he talks.

- **Gemini-powered conversation**
  - Text questions are sent to a small Flask API backed by Gemini.
  - Responses are generated using a character-specific prompt so Einstein stays
    in character and does not interrupt you mid-turn.

- **Voice playback**
  - Einstein's responses are spoken aloud in the browser using
    `window.speechSynthesis`.
  - The code prefers German/European-style voices where available and slightly
    adjusts pitch/rate to hint at Einstein's historic voice.

- **Future-ready character system**
  - A `Character` data model and registry in `mee_history/services/characters.py`
    makes it easy to add more historical figures later with their own prompts,
    bios, and media.

- **Cloud deployment–ready**
  - Includes `requirements.txt`, `Procfile`, and `runtime.txt` for Heroku-style
    deployments and general WSGI hosting.

---

## Project structure

```text
MEEHISTORY/
  app.py                     # Flask entrypoint (for local dev or WSGI)
  requirements.txt
  Procfile
  runtime.txt
  README.md
  mee_history/
    __init__.py              # create_app and blueprint registration
    config.py                # configuration + environment variables
    routes.py                # web routes (HTML UI)
    api.py                   # JSON API (Gemini-backed)
    services/
      __init__.py
      characters.py          # Character model + Einstein registry
      gemini_client.py       # Gemini wrapper client
    templates/
      base.html              # base layout
      index.html             # Einstein call UI
    static/
      css/
        main.css             # styling for the surreal call UI
      js/
        main.js              # WebRTC + chat + TTS logic
      media/
        # Place your Einstein avatar assets here (see below)
```

---

## Configuration

The application is configured via environment variables (see `mee_history/config.py`):

- `GEMINI_API_KEY` (**required**)
  - API key for the Gemini API.
- `GEMINI_MODEL_NAME` (optional; default: `gemini-1.5-pro`)
  - Override with a newer model, e.g. `gemini-3.0-pro`, once available.
- `SECRET_KEY` (optional; default: development-only value)
  - Flask secret key for sessions/CSRF. Set a strong random value in production.
- `FLASK_DEBUG` (optional; default: unset/false)
  - Set to `1` to enable Flask debug mode locally.

You can export these in your shell or place them in a `.env` file (if you use
`python-dotenv` or a similar loader in your environment).

---

## Running locally

1. **Create and activate a virtual environment** (recommended)

   ```bash
   python -m venv .venv
   .venv\Scripts\activate   # On Windows
   # source .venv/bin/activate  # On macOS/Linux
   ```

2. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Set environment variables** (at minimum `GEMINI_API_KEY`)

   ```bash
   set GEMINI_API_KEY=your_gemini_key_here
   set FLASK_DEBUG=1
   ```

4. **Run the development server**

   ```bash
   python app.py
   ```

5. **Open the app**

   - Navigate to http://localhost:5000 in a modern browser (Chrome, Edge, etc.).
   - Grant camera and microphone permissions when prompted.
   - The call with Albert Einstein will start automatically, and you can type
     questions in the chat panel.

---

## Einstein avatar media

Out of the box, the UI expects the following (you can replace them with your
own assets):

- `mee_history/static/media/einstein_idle.mp4` – a looping, subtle animation of
  Einstein "idling" on the call.
- `mee_history/static/media/einstein_still.png` – a still frame used as a
  poster/placeholder.

You can use any MP4/GIF-style asset that visually represents Einstein. Place
these files in `mee_history/static/media/` and ensure the filenames match the
paths configured in `mee_history/services/characters.py`.

The "speaking" effect is currently implemented as a soft glow + styling
variation around the Einstein tile while the text-to-speech engine plays.

---

## API reference

### `POST /api/ask`

Gemini-backed endpoint for asking a question to a specific character.

**Request body (JSON):**

```json
{
  "message": "What is time dilation?",
  "character_id": "einstein",      // optional, defaults to "einstein"
  "history": [                      // optional conversation history
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello, I am Albert Einstein." }
  ]
}
```

- `message` (string, required): latest user message.
- `character_id` (string, optional): which historical figure to consult.
- `history` (array, optional): previous turns as `{role, content}` objects.

**Successful response (JSON):**

```json
{
  "reply": "Time dilation is the phenomenon where..."
}
```

**Error responses:**

- `400 Bad Request` – missing `message` or unknown `character_id`.
- `500 Internal Server Error` – configuration or Gemini failures, with
  diagnostic text in `error` and `details`.

---

## How conversation + Gemini work

- The frontend (`static/js/main.js`) maintains a simple `conversationHistory`
  array of `{role, content}` messages.
- When you submit a question:
  - The latest user message and history are POSTed to `/api/ask`.
  - The backend loads the selected `Character` (Einstein by default).
  - `GeminiClient` in `services/gemini_client.py` builds a character-specific
    system-style message and sends the conversation to Gemini.
  - The plain-text reply is returned to the browser.
- The browser then:
  - Appends the reply to the on-screen chat log.
  - Uses the Web Speech API to speak it aloud.

Because Einstein only responds *after* you send a complete message and the
browser only plays one speech utterance at a time, the AI will not interrupt
you mid-turn.

---

## Adding more historical figures

To add a new character:

1. Open `mee_history/services/characters.py`.
2. Add a new `Character` entry to the `_CHARACTERS` registry, for example:

   ```python
   from .characters import Character

   _CHARACTERS["curie"] = Character(
       id="curie",
       name="Marie Curie",
       short_bio="Pioneer in radioactivity, first woman to win a Nobel Prize...",
       system_prompt=(
           "You are Marie Curie. Speak with a calm, precise, and thoughtful "
           "tone, explaining your discoveries and experiences in research..."
       ),
       avatar_video_url="/static/media/curie_idle.mp4",
       avatar_image_url="/static/media/curie_still.png",
       voice_description="Soft-spoken, French-accented female voice...",
   )
   ```

3. Add appropriate avatar media under `mee_history/static/media/`.
4. Update your frontend UI (template or JS) if you want to allow choosing
   between multiple figures instead of defaulting to Einstein.

The rest of the stack (API, Gemini client, conversation flow) will continue to
work as long as you pass the correct `character_id` to `/api/ask`.

---

## Deployment

This project is designed to be deployed on common cloud platforms such as
Heroku or any environment that can run a WSGI app.

### Heroku-style deployment

1. **Create an app**

   ```bash
   heroku create meehistory
   ```

2. **Set environment variables**

   ```bash
   heroku config:set GEMINI_API_KEY=your_gemini_key_here
   heroku config:set GEMINI_MODEL_NAME=gemini-1.5-pro
   heroku config:set SECRET_KEY=some-long-random-string
   ```

3. **Deploy**

   ```bash
   git add .
   git commit -m "Deploy MEEHISTORY"
   git push heroku main
   ```

4. **Visit the app**

   Open the URL provided by Heroku; the Flask app will be served by `gunicorn`
   as configured in the `Procfile`.

### Other platforms (AWS, etc.)

- **Containerized deployment**: Build a Docker image that installs
  `requirements.txt` and runs `gunicorn app:app`.
- **AWS Elastic Beanstalk / App Runner / Azure App Service**: Point the service
  at `app:app` as the WSGI entrypoint and configure environment variables in
  the platform UI.

---

## Extending video and voice realism

The current implementation focuses on a simple, open-stack approach:

- Camera/microphone from the browser via WebRTC's `getUserMedia`.
- A static or looping Einstein avatar video.
- Browser-native text-to-speech for Einstein's responses.

To achieve a more lifelike experience (e.g., synchronized mouth movements,
custom Einstein voice), you can integrate third-party services:

- **Talking-head / avatar APIs** (e.g., real-time lip-sync on a video stream).
- **Custom-voice TTS providers** (trained on public-domain or licensed
  recordings).

Typical integration points:

- Replace or augment `speakAsEinstein` in `static/js/main.js` to request audio
  from a TTS API instead of using `speechSynthesis`.
- Stream the resulting audio/video into the Einstein `<video>` element.
- Optionally add a small Flask sidecar endpoint that proxies calls to those
  providers so API keys stay on the server side.

Be sure **not** to hard-code API keys in the frontend; always keep them in
server-side environment variables.

---

## Browser support and notes

- Requires a modern browser with support for:
  - `navigator.mediaDevices.getUserMedia` (WebRTC camera/mic capture).
  - The Fetch API.
  - The Web Speech API (for in-browser TTS). If unavailable, the conversation
    still works as text-only.
- The app does not persist conversation history on the server by default; it is
  held only in the browser session.

---

## Summary

MEEHISTORY gives you a ready-to-run Flask + Gemini experience where users are
instantly dropped into a surreal "video call" with Albert Einstein. The
architecture intentionally separates:

- **Web UI and media handling** (templates + JS + CSS),
- **AI orchestration** (Gemini client + character prompts), and
- **Deployment concerns** (requirements, Procfile, env vars),

so you can iteratively upgrade the visual realism and expand the cast of
historical figures without rewriting the core application.
