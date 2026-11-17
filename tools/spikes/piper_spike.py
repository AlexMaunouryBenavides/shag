"""Spike 1.4 — Piper : prise en compte des accents toniques et choix des voix.

1. Compare la phonémisation (espeak-ng) d'un mot avec et sans accent explicite (U+0301)
   pour vérifier que l'accent fourni est respecté.
2. Génère des échantillons Opus pour chaque voix dans tools/.cache/spike_audio/.

Usage : python -I -X utf8 tools/spikes/piper_spike.py
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import soundfile as sf
from piper import PiperVoice
from scipy.signal import resample_poly

ROOT = Path(__file__).resolve().parents[2]
VOICES_DIR = ROOT / "tools" / ".cache" / "voices"
OUT = ROOT / "tools" / ".cache" / "spike_audio"
VOICES = ["ru_RU-irina-medium", "ru_RU-denis-medium", "ru_RU-dmitri-medium", "ru_RU-ruslan-medium"]

ACUTE = "́"

# (sans accent, accent A, accent B) : homographes dont l'accent change le sens
STRESS_PAIRS = [
    ("замок", "за" + ACUTE + "мок", "замо" + ACUTE + "к"),  # château / serrure
    ("мука", "му" + ACUTE + "ка", "мука" + ACUTE),  # supplice / farine
    ("писать", "пи" + ACUTE + "сать", "писа" + ACUTE + "ть"),  # faire pipi / écrire
]

SAMPLES = {
    "privet": "Приве" + ACUTE + "т! Как дела" + ACUTE + "?",
    "kofe": "Я хочу" + ACUTE + " ко" + ACUTE + "фе, пожа" + ACUTE + "луйста.",
    "voda": "Хорошо" + ACUTE + ". И во" + ACUTE + "ду?",
    "moloko": "молоко" + ACUTE,
    "question": "Ты хо" + ACUTE + "чешь чай?",
    "statement": "Ты хо" + ACUTE + "чешь чай.",
}


def to_opus(chunks, sample_rate: int, dest: Path) -> int:
    audio = np.concatenate([c.audio_int16_array for c in chunks]).astype(np.float32) / 32768.0
    # Opus n'accepte que 8/12/16/24/48 kHz : on rééchantillonne 22050 → 24000.
    audio = resample_poly(audio, 160, 147) if sample_rate == 22050 else audio
    sf.write(dest, audio, 24000, format="OGG", subtype="OPUS")
    return dest.stat().st_size


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    voices = {name: PiperVoice.load(VOICES_DIR / f"{name}.onnx") for name in VOICES}

    print("== Phonémisation (voix irina) ==")
    v = voices["ru_RU-irina-medium"]
    for bare, a, b in STRESS_PAIRS:
        ph = ["".join(sum(v.phonemize(w), [])) for w in (bare, a, b)]
        verdict = "OK : accent respecté" if ph[1] != ph[2] else "ÉCHEC : accent ignoré"
        print(f"{bare:8} sans={ph[0]:14} A={ph[1]:14} B={ph[2]:14} {verdict}")

    print("\n== Échantillons ==")
    for name, voice in voices.items():
        for key, text in SAMPLES.items():
            dest = OUT / f"{name.split('-')[1]}_{key}.opus"
            size = to_opus(list(voice.synthesize(text)), voice.config.sample_rate, dest)
            print(f"{dest.name:28} {size / 1024:5.1f} Ko")


if __name__ == "__main__":
    main()
