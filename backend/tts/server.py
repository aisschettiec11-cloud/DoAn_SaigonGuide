"""Internal speech provider; supported languages come from gTTS."""
import io
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from gtts import gTTS, gTTSError
from gtts.lang import tts_langs

SUPPORTED_LANGUAGES = tts_langs()


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/synthesize":
            self.send_error(404)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 150000:
                raise ValueError("Invalid request size")
            data = json.loads(self.rfile.read(size))
            text, lang = data.get("text"), data.get("lang")
            if not isinstance(lang, str) or lang not in SUPPORTED_LANGUAGES or not isinstance(text, str) or not text.strip() or len(text) > 20000:
                raise ValueError("Invalid language or text")
            audio = io.BytesIO()
            gTTS(text, lang=lang, lang_check=False, timeout=(5, 30)).write_to_fp(audio)
            body = audio.getvalue()
        except (ValueError, TypeError, AttributeError):
            self.send_error(400, "Invalid speech request")
            return
        except gTTSError:
            self.send_error(502, "Speech provider unavailable")
            return
        self.send_response(200)
        self.send_header("Content-Type", "audio/mpeg")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
