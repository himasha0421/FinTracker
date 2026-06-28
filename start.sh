#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
AI_DIR="$ROOT/ai_backend"
AI_PORT="${AI_PORT:-8000}"

# --- AI backend setup ---
if [ ! -d "$AI_DIR/venv" ]; then
  echo "Creating Python venv..."
  python3 -m venv "$AI_DIR/venv"
fi

# shellcheck disable=SC1091
source "$AI_DIR/venv/bin/activate"

if ! python -c "import fastapi" >/dev/null 2>&1; then
  echo "Installing Python dependencies..."
  pip install --upgrade pip >/dev/null
  pip install -r "$AI_DIR/requirements.txt"
fi

# --- Web app setup ---
if [ ! -d "$ROOT/node_modules" ]; then
  echo "Installing Node dependencies..."
  (cd "$ROOT" && npm install)
fi

# --- Run both ---
cleanup() {
  echo
  echo "Stopping services..."
  [ -n "${AI_PID:-}" ] && kill "$AI_PID" 2>/dev/null || true
  [ -n "${WEB_PID:-}" ] && kill "$WEB_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting AI backend on port $AI_PORT..."
(cd "$AI_DIR" && uvicorn main:app --reload --host 0.0.0.0 --port "$AI_PORT") &
AI_PID=$!

echo "Starting web app..."
(cd "$ROOT" && npm run dev) &
WEB_PID=$!

wait
