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
SERVICE_NAME="backend"

# Deployment mode: "dev" or "prod"
MODE="dev" # Change to "prod" for production deployment

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
    
    if [ ! -d "backend" ]; then
        print_error "Backend directory not found"
        exit 1
    fi
    
    chmod 400 "$KEY_PATH"
}

# Function to sync backend files
sync_backend_files() {
    print_status "Syncing backend files to server..."
    
    # Sync backend directory excluding node_modules and build artifacts
    rsync -avz --progress \
        --exclude 'node_modules' \
        --exclude 'dist' \
        --exclude '*.log' \
        --exclude '.env*' \
        -e "ssh -i $KEY_PATH" \
        ./backend/ "$SERVER_HOST:$REMOTE_DIR/backend/"
    
    if [ $? -eq 0 ]; then
        print_success "Backend files synced successfully"
    else
        print_error "Failed to sync backend files"
        exit 1
    fi
}

# Function to deploy backend
deploy_backend() {
    print_status "Deploying backend service..."
    
    if [ "$MODE" = "dev" ]; then
        ssh -i "$KEY_PATH" "$SERVER_HOST" << ENDSSH
            cd $REMOTE_DIR/backend
            
            echo "Installing/updating backend dependencies..."
            pnpm install
            
            echo "Stopping existing backend process..."
            pm2 stop backend 2>/dev/null || echo "No existing backend process found"
            
            echo "Starting backend in dev mode with PM2..."
            pm2 start "pnpm dev" --name backend --update-env
            
            echo "Saving PM2 configuration..."
            pm2 save
            
            echo "Backend deployment (dev mode) completed!"
            echo "=== Backend Status ==="
            pm2 show backend
ENDSSH
    else
        ssh -i "$KEY_PATH" "$SERVER_HOST" << ENDSSH
            cd $REMOTE_DIR/backend
            
            echo "Installing/updating backend dependencies..."
            pnpm install
            
            echo "Building backend..."
            pnpm run build
            
            echo "Stopping existing backend process..."
            pm2 stop backend 2>/dev/null || echo "No existing backend process found"
            
            echo "Starting backend with PM2..."
            pm2 start dist/index.js --name backend --update-env
            
            echo "Saving PM2 configuration..."
            pm2 save
            
            echo "Backend deployment completed!"
            echo "=== Backend Status ==="
            pm2 show backend
ENDSSH
    fi

    if [ $? -eq 0 ]; then
        print_success "Backend deployed successfully"
    else
        print_error "Backend deployment failed"
        exit 1
    fi
}

# Function to show logs
show_logs() {
    print_status "Showing backend logs (Press Ctrl+C to exit)..."
    ssh -i "$KEY_PATH" "$SERVER_HOST" "pm2 logs backend --lines 50"
}

# Function to show status
show_status() {
    print_status "Backend service status:"
    ssh -i "$KEY_PATH" "$SERVER_HOST" << 'ENDSSH'
        echo "=== PM2 Backend Status ==="
        pm2 show backend
        
        echo ""
        echo "=== Recent Backend Logs ==="
        pm2 logs backend --lines 10 --nostream
ENDSSH
}

# Main function
main() {
    case "${1:-deploy}" in
        "deploy")
            print_status "Starting backend deployment..."
            check_prerequisites
            sync_backend_files
            deploy_backend
            print_success "Backend deployment completed!"
            echo ""
            echo "=== Access URLs ==="
            echo "Backend API: http://13.200.230.79/api/"
            echo ""
            echo "=== Useful Commands ==="
            echo "View logs: ./deploy-backend.sh logs"
            echo "Check status: ./deploy-backend.sh status"
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
            echo "  deploy    Deploy backend service (default)"
            echo "  logs      Show backend logs"
            echo "  status    Show backend status"
            echo "  help      Show this help message"
            echo ""
            echo "Environment:"
            echo "  MODE      Set to 'dev' to use 'pnpm dev', or 'prod' for production build"
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
