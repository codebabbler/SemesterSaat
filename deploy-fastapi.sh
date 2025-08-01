#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EC2_IP="ec2-13-200-230-79.ap-south-1.compute.amazonaws.com"
SERVER_HOST="ubuntu@$EC2_IP"
KEY_PATH="college-project.pem"
REMOTE_DIR="~/SemesterSaat"
SERVICE_NAME="fastapi"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    if [ ! -f "$KEY_PATH" ]; then
        print_error "PEM file '$KEY_PATH' not found"
        exit 1
    fi
    
    if [ ! -d "fast-api" ]; then
        print_error "FastAPI directory not found"
        exit 1
    fi
    
    chmod 400 "$KEY_PATH"
}

# Function to sync FastAPI files
sync_fastapi_files() {
    print_status "Syncing FastAPI files to server..."
    
    # Sync fast-api directory excluding virtual environment and cache
    rsync -avz --progress \
        --exclude 'venv' \
        --exclude '__pycache__' \
        --exclude '*.pyc' \
        --exclude '.env*' \
        -e "ssh -i $KEY_PATH" \
        ./fast-api/ "$SERVER_HOST:$REMOTE_DIR/fast-api/"
    
    if [ $? -eq 0 ]; then
        print_success "FastAPI files synced successfully"
    else
        print_error "Failed to sync FastAPI files"
        exit 1
    fi
}

# Function to deploy FastAPI
deploy_fastapi() {
    print_status "Deploying FastAPI service..."
    
    ssh -i "$KEY_PATH" "$SERVER_HOST" << ENDSSH
        cd $REMOTE_DIR/fast-api
        
        echo "1. Installing full Python package if missing..."
        sudo apt install python3-full -y
        
        echo "2. Creating a virtual environment..."
        python3 -m venv venv
        
        echo "3. Activating virtual environment..."
        source venv/bin/activate
        
        echo "4. Installing requirements safely inside the venv..."
        pip install -r requirements.txt
        
        echo "Stopping existing FastAPI process..."
        pm2 stop fastapi 2>/dev/null || echo "No existing FastAPI process found"
        
        echo "Starting FastAPI with PM2..."
        pm2 start venv/bin/uvicorn --name fastapi -- main:app --host 127.0.0.1 --port 8080
        
        echo "Saving PM2 configuration..."
        pm2 save
        
        echo "FastAPI deployment completed!"
        echo "=== FastAPI Status ==="
        pm2 show fastapi
ENDSSH

    if [ $? -eq 0 ]; then
        print_success "FastAPI deployed successfully"
    else
        print_error "FastAPI deployment failed"
        exit 1
    fi
}

# Function to show logs
show_logs() {
    print_status "Showing FastAPI logs (Press Ctrl+C to exit)..."
    ssh -i "$KEY_PATH" "$SERVER_HOST" "pm2 logs fastapi --lines 50"
}

# Function to show status
show_status() {
    print_status "FastAPI service status:"
    ssh -i "$KEY_PATH" "$SERVER_HOST" << 'ENDSSH'
        echo "=== PM2 FastAPI Status ==="
        pm2 show fastapi
        
        echo ""
        echo "=== Recent FastAPI Logs ==="
        pm2 logs fastapi --lines 10 --nostream
ENDSSH
}

# Function to test FastAPI
test_api() {
    print_status "Testing FastAPI endpoint..."
    ssh -i "$KEY_PATH" "$SERVER_HOST" << 'ENDSSH'
        echo "Testing FastAPI health check..."
        curl -s http://localhost:8080/ || echo "FastAPI not responding on localhost:8080"
        
        echo ""
        echo "Testing FastAPI docs endpoint..."
        curl -s http://localhost:8080/docs -I | head -1 || echo "FastAPI docs not accessible"
ENDSSH
}

# Main function
main() {
    case "${1:-deploy}" in
        "deploy")
            print_status "Starting FastAPI deployment..."
            check_prerequisites
            sync_fastapi_files
            deploy_fastapi
            print_success "FastAPI deployment completed!"
            echo ""
            echo "=== Access URLs ==="
            echo "FastAPI: http://13.200.230.79/ai/"
            echo "FastAPI Docs: http://13.200.230.79/ai/docs"
            echo ""
            echo "=== Useful Commands ==="
            echo "View logs: ./deploy-fastapi.sh logs"
            echo "Check status: ./deploy-fastapi.sh status"
            echo "Test API: ./deploy-fastapi.sh test"
            echo "SSH to server: ssh -i $KEY_PATH $SERVER_HOST"
            ;;
        "logs")
            show_logs
            ;;
        "status")
            show_status
            ;;
        "test")
            test_api
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  deploy    Deploy FastAPI service (default)"
            echo "  logs      Show FastAPI logs"
            echo "  status    Show FastAPI status"
            echo "  test      Test FastAPI endpoints"
            echo "  help      Show this help message"
            ;;
        *)
            print_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
