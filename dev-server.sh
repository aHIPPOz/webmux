#!/bin/bash
# dev-server.sh - Start local development server

if ! command -v python3 &> /dev/null; then
  if ! command -v python &> /dev/null; then
    echo "❌ Python not found. Install Python 3 or use: npx http-server"
    exit 1
  fi
  PYTHON=python
else
  PYTHON=python3
fi

PORT=${1:-8080}
echo "🚀 Starting Wasmux development server on http://localhost:$PORT"
echo "📱 Press Ctrl+C to stop"
echo ""
cd "$(dirname "$0")"
$PYTHON -m http.server $PORT --bind 127.0.0.1
