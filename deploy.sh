#!/bin/bash

EC2_IP=ec2-13-200-230-79.ap-south-1.compute.amazonaws.com
KEY_PATH="college-project.pem"
REMOTE_DIR="~/SemesterSaat"

echo "🔁 Syncing files to EC2..."
scp -i $KEY_PATH -r backend fast-api frontend ubuntu@$EC2_IP:$REMOTE_DIR

echo "🚀 Running remote setup..."
ssh -i $KEY_PATH ubuntu@$EC2_IP << 'EOF'

cd ~/SemesterSaat

# --- Setup Express backend ---
cd backend
npm install
pm2 start index.js --name backend

# --- Setup FastAPI ---
cd ../fast-api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pm2 start uvicorn --name fastapi -- "main:app" --host 0.0.0.0 --port 8000
deactivate

# --- Setup Next.js frontend ---
cd ../frontend
npm install
npm run build
pm2 start npm --name frontend -- start

EOF