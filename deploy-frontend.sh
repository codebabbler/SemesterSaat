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
SERVICE_NAME="frontend"

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
    
    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found"
        exit 1
    fi
    
    chmod 400 "$KEY_PATH"
}

# Function to sync frontend files
sync_frontend_files() {
    print_status "Syncing frontend files to server..."
    
    # Sync frontend directory excluding node_modules and build artifacts
    rsync -avz --progress \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude '*.log' \
        --exclude '.env*' \
        -e "ssh -i $KEY_PATH" \
        ./frontend/ "$SERVER_HOST:$REMOTE_DIR/frontend/"
    
    if [ $? -eq 0 ]; then
        print_success "Frontend files synced successfully"
    else
        print_error "Failed to sync frontend files"
        exit 1
    fi
}

# Function to deploy frontend
deploy_frontend() {
    print_status "Deploying frontend service..."
    
    ssh -i "$KEY_PATH" "$SERVER_HOST" << ENDSSH
        cd $REMOTE_DIR/frontend
        
        echo "Installing/updating frontend dependencies..."
        pnpm install
        
        echo "Building frontend..."
        pnpm run build
        
        echo "Stopping existing frontend process..."
        pm2 stop frontend 2>/dev/null || echo "No existing frontend process found"
        
        echo "Starting frontend with PM2..."
        pm2 start pnpm start --name frontend --update-env -- start -p 3000
        
        echo "Saving PM2 configuration..."
        pm2 save
        
        echo "Frontend deployment completed!"
        echo "=== Frontend Status ==="
        pm2 show frontend
ENDSSH

    if [ $? -eq 0 ]; then
        print_success "Frontend deployed successfully"
    else
        print_error "Frontend deployment failed"
        exit 1
    fi
}

# Function to show logs
show_logs() {
    print_status "Showing frontend logs (Press Ctrl+C to exit)..."
    ssh -i "$KEY_PATH" "$SERVER_HOST" "pm2 logs frontend --lines 50"
}

# Function to show status
show_status() {
    print_status "Frontend service status:"
    ssh -i "$KEY_PATH" "$SERVER_HOST" << 'ENDSSH'
        echo "=== PM2 Frontend Status ==="
        pm2 show frontend
        
        echo ""
        echo "=== Recent Frontend Logs ==="
        pm2 logs frontend --lines 10 --nostream
ENDSSH
}

# Main function
main() {
    case "${1:-deploy}" in
        "deploy")
            print_status "Starting frontend deployment..."
            check_prerequisites
            sync_frontend_files
            deploy_frontend
            print_success "Frontend deployment completed!"
            echo ""
            echo "=== Access URLs ==="
            echo "Frontend: http://13.200.230.79/"
            echo ""
            echo "=== Useful Commands ==="
            echo "View logs: ./deploy-frontend.sh logs"
            echo "Check status: ./deploy-frontend.sh status"
            echo "SSH to server: ssh -i $KEY_PATH $SERVER_HOST"
            ;;
        "logs")
            show_logs
            ;;
        "status")
            show_status
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  deploy    Deploy frontend service (default)"
            echo "  logs      Show frontend logs"
            echo "  status    Show frontend status"
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
