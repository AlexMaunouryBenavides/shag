"""Génération audio : Piper (local) → Opus 24 kHz, avec cache par hash du texte.

Le nom de fichier dépend de la voix et du texte accentué : seuls les textes nouveaux ou
modifiés sont synthétisés (spec content-pipeline, « Génération audio »).
"""

from __future__ import annotations

import hashlib
from functools import lru_cache
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

from .paths import AUDIO_OUT, VOICES

DEFAULT_VOICE = "ru_RU-irina-medium"
OPUS_RATE = 24000


def audio_name(text: str, voice: str = DEFAULT_VOICE) -> str:
    digest = hashlib.sha1(f"{voice}\n{text}".encode("utf-8")).hexdigest()[:16]
    return f"{digest}.opus"


@lru_cache(maxsize=4)
def _voice(name: str):
    from piper import PiperVoice  # import tardif : lent à charger

    model = VOICES / f"{name}.onnx"
    if not model.exists():
        raise FileNotFoundError(
            f"voix Piper absente : {model}\n"
            f"→ python -m piper.download_voices {name} --data-dir {VOICES}")
    return PiperVoice.load(model)


def write_opus(audio: np.ndarray, sample_rate: int, dest: Path) -> None:
    """Écrit un signal float32 [-1, 1] en Opus 24 kHz (rééchantillonnage si nécessaire)."""
    if sample_rate != OPUS_RATE:
        g = np.gcd(sample_rate, OPUS_RATE)
        audio = resample_poly(audio, OPUS_RATE // g, sample_rate // g)
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".tmp.opus")
    sf.write(tmp, audio.astype(np.float32), OPUS_RATE, format="OGG", subtype="OPUS")
    tmp.replace(dest)


def synthesize(text: str, voice: str = DEFAULT_VOICE, out_dir: Path = AUDIO_OUT) -> tuple[str, bool]:
    """Synthétise `text` (accentué) si nécessaire. Renvoie (nom de fichier, créé ?)."""
    name = audio_name(text, voice)
    dest = out_dir / name
    if dest.exists():
        return name, False
    v = _voice(voice)
    chunks = list(v.synthesize(text))
    audio = np.concatenate([c.audio_int16_array for c in chunks]).astype(np.float32) / 32768.0
    write_opus(audio, v.config.sample_rate, dest)
    return name, True
