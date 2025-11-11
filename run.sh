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
  # Detect available terminal emulator
  if command -v kitty &> /dev/null; then
    TERMINAL="kitty"
    echo "Detected Linux. Using kitty to open new windows."
    kitty --detach bash -c "cd '$(pwd)'/fast-api && python3 -m venv .venv && source .venv/bin/activate && python3 main.py; exec bash" &
    kitty --detach bash -c "cd '$(pwd)'/backend && pnpm dev; exec bash" &
    kitty --detach bash -c "cd '$(pwd)'/frontend && pnpm dev; exec bash" &
  elif command -v alacritty &> /dev/null; then
    TERMINAL="alacritty"
    echo "Detected Linux. Using alacritty to open new windows."
    alacritty -e bash -c "cd '$(pwd)'/fast-api && python3 -m venv .venv && source .venv/bin/activate && python3 main.py; exec bash" &
    alacritty -e bash -c "cd '$(pwd)'/backend && pnpm dev; exec bash" &
    alacritty -e bash -c "cd '$(pwd)'/frontend && pnpm dev; exec bash" &
  elif command -v gnome-terminal &> /dev/null; then
    TERMINAL="gnome-terminal"
    echo "Detected Linux. Using gnome-terminal to open new windows."
    gnome-terminal -- bash -c "cd '$(pwd)'/fast-api && python3 -m venv .venv && source .venv/bin/activate && python3 main.py; exec bash" &
    gnome-terminal -- bash -c "cd '$(pwd)'/backend && pnpm dev; exec bash" &
    gnome-terminal -- bash -c "cd '$(pwd)'/frontend && pnpm dev; exec bash" &
  elif command -v xterm &> /dev/null; then
    TERMINAL="xterm"
    echo "Detected Linux. Using xterm to open new windows."
    xterm -e bash -c "cd '$(pwd)'/fast-api && python3 -m venv .venv && source .venv/bin/activate && python3 main.py; exec bash" &
    xterm -e bash -c "cd '$(pwd)'/backend && pnpm dev; exec bash" &
    xterm -e bash -c "cd '$(pwd)'/frontend && pnpm dev; exec bash" &
  else
    echo "Error: No supported terminal emulator found."
    echo "Please install one of: kitty, alacritty, gnome-terminal, or xterm"
    exit 1
  fi
  echo "All services started in separate Terminal windows."
  echo "You can close individual services by closing their terminal windows."
else
  echo "Unsupported OS. Please start the services manually."
fi
