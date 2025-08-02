#!/bin/bash

echo "Starting all services in separate Terminal tabs..."

echo "Starting FastAPI service..."
osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/fast-api && python3 -m venv .venv && source .venv/bin/activate && python3 main.py"'

echo "Starting Backend service..."
osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/backend && pnpm dev"'

echo "Starting Frontend service..."
osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/frontend && pnpm dev"'

echo "All services started in separate Terminal tabs."
echo "You can close individual services by closing their terminal tabs."
