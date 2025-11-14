#!/usr/bin/env bash
set -euo pipefail

python -m backend.seed --reset
uvicorn backend.app:app --host 0.0.0.0 --port "${PORT:-8000}"
