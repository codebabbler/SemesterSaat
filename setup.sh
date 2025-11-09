#!/bin/bash

set -e

echo "Setting up backend..."
pushd backend > /dev/null
pnpm install
popd > /dev/null

echo "Setting up frontend..."
pushd frontend > /dev/null
pnpm install
popd > /dev/null

echo "Setting up fast-api..."
pushd fast-api > /dev/null

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

echo "Activating virtual environment and installing requirements..."
source .venv/bin/activate
pip install -r requirements.txt

popd > /dev/null

echo "Setup complete!"

