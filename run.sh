#!/bin/bash

echo "Starting all services in separate Terminal tabs..."

if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Detected macOS. Using osascript to open new Terminal tabs."
  echo "Starting FastAPI service..."
  osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/fast-api && python3 -m venv .venv && source .venv/bin/activate && python3 main.py"'

  echo "Starting Backend service..."
  osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/backend && pnpm dev"'

  echo "Starting Frontend service..."
  osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/frontend && pnpm dev"'

  echo "All services started in separate Terminal tabs."
  echo "You can close individual services by closing their terminal tabs."
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  echo "Detected Linux. Using gnome-terminal to open new tabs/windows."
  gnome-terminal -- bash -c "cd '$(pwd)'/fast-api && python3 -m venv .venv && source .venv/bin/activate && python3 main.py; exec bash" &
  gnome-terminal -- bash -c "cd '$(pwd)'/backend && pnpm dev; exec bash" &
  gnome-terminal -- bash -c "cd '$(pwd)'/frontend && pnpm dev; exec bash" &
  echo "All services started in separate Terminal windows."
  echo "You can close individual services by closing their terminal windows."
else
  echo "Unsupported OS. Please start the services manually."
fi
