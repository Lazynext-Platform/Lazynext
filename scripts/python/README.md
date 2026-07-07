# Python Scripts — Lazynext Platform

Python utilities and reference implementations for the Lazynext NLE.

## Contents

| Path | Description |
|------|-------------|
| `app.py` | FastAPI wrapper consolidating Python service endpoints |
| `main.py` | Entry point for the Python service layer |
| `auto-editor/` | Third-party auto-editor library (video silence removal, motion tracking) |
| `clip-anything/` | CLIP-based open-vocabulary video segmentation |
| `funclip/` | FunASR/Whisper-based speech clipping and transcription |
| `requirements.txt` | Python dependencies for the scripts layer |

## Usage

```bash
pip install -r requirements.txt
python main.py
```
