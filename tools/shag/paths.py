from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "content"
DATA = ROOT / "data"
CACHE = ROOT / "tools" / ".cache"
VOICES = CACHE / "voices"
PUBLIC_CONTENT = ROOT / "public" / "content"
AUDIO_OUT = PUBLIC_CONTENT / "audio"
