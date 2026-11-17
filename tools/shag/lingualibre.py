"""Substitution audio par un enregistrement humain Lingua Libre (Wikimedia Commons).

Utilisé uniquement pour les mots isolés listés dans content/audio_exceptions.yaml, c'est-à-dire
ceux que Piper prononce mal. Les fichiers Lingua Libre russes sont nommés
« LL-Q7737 (rus)-<locuteur>-<mot>.wav ». Les réponses de l'API sont mises en cache.
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundfile as sf

from .paths import AUDIO_OUT, CACHE
from .text import strip_accents
from .tts import write_opus

API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "shag-content-pipeline/0.1"
CACHE_DIR = CACHE / "lingualibre"


@dataclass
class Recording:
    word: str
    file_title: str
    url: str
    author: str
    license: str


def _get(params: dict) -> dict:
    query = urllib.parse.urlencode({**params, "format": "json", "formatversion": "2"})
    req = urllib.request.Request(f"{API}?{query}", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def find_recording(word: str) -> Recording | None:
    bare = strip_accents(word).lower()
    cache = CACHE_DIR / f"{bare}.json"
    if cache.exists():
        data = json.loads(cache.read_text(encoding="utf-8"))
        return Recording(**data) if data else None

    found = _get({"action": "query", "list": "search", "srnamespace": 6, "srlimit": 20,
                  "srsearch": f'intitle:"LL-Q7737 (rus)" intitle:"{bare}"'})
    titles = [h["title"] for h in found.get("query", {}).get("search", [])
              if h["title"].lower().endswith(f"-{bare}.wav")]
    rec = None
    if titles:
        info = _get({"action": "query", "titles": titles[0], "prop": "imageinfo",
                     "iiprop": "url|extmetadata"})
        page = info["query"]["pages"][0]
        ii = page["imageinfo"][0]
        meta = ii.get("extmetadata", {})
        rec = Recording(
            word=bare, file_title=titles[0], url=ii["url"],
            author=_plain(meta.get("Artist", {}).get("value", "Lingua Libre")),
            license=meta.get("LicenseShortName", {}).get("value", "CC BY-SA 4.0"),
        )
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(rec.__dict__ if rec else None, ensure_ascii=False), encoding="utf-8")
    return rec


def _plain(html: str) -> str:
    """« Speaker: X\nRecorder: Y » (HTML) → « X »."""
    import re
    text = re.sub(r"<[^>]+>", "", html).strip()
    m = re.search(r"Speaker:\s*([^\n]+)", text)
    return (m.group(1) if m else text.splitlines()[0] if text else "Lingua Libre").strip()


def fetch_as_opus(rec: Recording, name: str, out_dir: Path = AUDIO_OUT) -> None:
    dest = out_dir / name
    if dest.exists():
        return
    raw = CACHE_DIR / "wav" / f"{rec.word}.wav"
    if not raw.exists():
        raw.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(rec.url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=120) as r:
            raw.write_bytes(r.read())
    audio, rate = sf.read(raw, dtype="float32", always_2d=True)
    mono = audio.mean(axis=1)
    peak = float(np.max(np.abs(mono))) or 1.0
    write_opus(mono / peak * 0.9, rate, dest)
