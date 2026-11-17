"""Télécharge les données tierces utilisées par le pipeline de contenu vers data/.

Les fichiers sont des données (CSV/TSV), jamais exécutés. data/ n'est pas versionné.

Sources :
- OpenRussian (CC BY-SA 4.0) : dictionnaire avec accents toniques
  https://github.com/Badestrand/russian-dictionary
- Tatoeba (CC BY 2.0 FR) : phrases russes, françaises et leurs liens de traduction
  https://tatoeba.org/fr/downloads

Les enregistrements Lingua Libre sont recherchés mot par mot au moment de la
génération audio (voir tts.py), il n'y a donc pas d'index à télécharger ici.

Usage : python tools/download_data.py [--force]
"""

from __future__ import annotations

import argparse
import bz2
import shutil
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

OPENRUSSIAN_BASE = "https://raw.githubusercontent.com/Badestrand/russian-dictionary/master/"
TATOEBA_BASE = "https://downloads.tatoeba.org/exports/per_language/"

FILES: list[tuple[str, str, bool]] = [
    # (url, destination relative à data/, décompresser bz2 ?)
    (OPENRUSSIAN_BASE + "nouns.csv", "openrussian/nouns.csv", False),
    (OPENRUSSIAN_BASE + "verbs.csv", "openrussian/verbs.csv", False),
    (OPENRUSSIAN_BASE + "adjectives.csv", "openrussian/adjectives.csv", False),
    (OPENRUSSIAN_BASE + "others.csv", "openrussian/others.csv", False),
    (OPENRUSSIAN_BASE + "LICENSE", "openrussian/LICENSE", False),
    (TATOEBA_BASE + "rus/rus_sentences.tsv.bz2", "tatoeba/rus_sentences.tsv", True),
    (TATOEBA_BASE + "fra/fra_sentences.tsv.bz2", "tatoeba/fra_sentences.tsv", True),
    (TATOEBA_BASE + "rus/rus-fra_links.tsv.bz2", "tatoeba/rus-fra_links.tsv", True),
]

USER_AGENT = "shag-content-pipeline/0.1"


def download(url: str, dest: Path, decompress: bool) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=120) as response, open(tmp, "wb") as out:
        source = bz2.BZ2File(response) if decompress else response
        shutil.copyfileobj(source, out)
    tmp.replace(dest)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--force", action="store_true", help="retélécharger même si présent")
    args = parser.parse_args()

    for url, rel, decompress in FILES:
        dest = DATA / rel
        if dest.exists() and not args.force:
            print(f"déjà présent : {rel}")
            continue
        print(f"téléchargement : {rel}")
        download(url, dest, decompress)
    print("ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
