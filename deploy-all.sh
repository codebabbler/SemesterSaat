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

# Function to make scripts executable
make_scripts_executable() {
    chmod +x deploy-backend.sh deploy-frontend.sh deploy-fastapi.sh
}

# Function to deploy all services
deploy_all() {
    print_status "Deploying all services..."
    
    print_status "Step 1/3: Deploying Backend..."
    ./deploy-backend.sh deploy
    if [ $? -ne 0 ]; then
        print_error "Backend deployment failed"
        exit 1
    fi
    
    print_status "Step 2/3: Deploying FastAPI..."
    ./deploy-fastapi.sh deploy
    if [ $? -ne 0 ]; then
        print_error "FastAPI deployment failed"
        exit 1
    fi
    
    print_status "Step 3/3: Deploying Frontend..."
    ./deploy-frontend.sh deploy
    if [ $? -ne 0 ]; then
        print_error "Frontend deployment failed"
        exit 1
    fi
    
    print_success "All services deployed successfully!"
    show_all_status
}

# Function to show status of all services
show_all_status() {
    print_status "Checking all services status..."
    
    ssh -i "$KEY_PATH" "$SERVER_HOST" << 'ENDSSH'
        echo "==================== SERVICE STATUS ===================="
        echo ""
        echo "=== PM2 Services (Backend & Frontend) ==="
        pm2 status
        
        echo ""
        echo "=== FastAPI Service (PM2) ==="
        pm2 show fastapi
        
        echo ""
        echo "=== Caddy Service (Reverse Proxy) ==="
        sudo systemctl status caddy --no-pager -l
        
        echo ""
        echo "==================== QUICK TESTS ===================="
        echo "Testing Backend (localhost:5000)..."
        curl -s -o /dev/null -w "Backend: %{http_code}\n" http://localhost:5000/ || echo "Backend: Not responding"
        
        echo "Testing FastAPI (localhost:8080)..."
        curl -s -o /dev/null -w "FastAPI: %{http_code}\n" http://localhost:8080/ || echo "FastAPI: Not responding"
        
        echo "Testing Frontend (localhost:3000)..."
        curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost:3000/ || echo "Frontend: Not responding"
        
        echo ""
        echo "==================== ACCESS URLS ===================="
        echo "Frontend: http://13.200.230.79/"
        echo "Backend API: http://13.200.230.79/api/"
        echo "FastAPI: http://13.200.230.79/ai/"
        echo "FastAPI Docs: http://13.200.230.79/ai/docs"
ENDSSH
}

# Function to show logs from all services
show_all_logs() {
    print_status "Showing logs from all services..."
    
    ssh -i "$KEY_PATH" "$SERVER_HOST" << 'ENDSSH'
        echo "==================== RECENT LOGS ===================="
        echo ""
        echo "=== Backend Logs ==="
        pm2 logs backend --lines 5 --nostream
        
        echo ""
        echo "=== Frontend Logs ==="
        pm2 logs frontend --lines 5 --nostream
        
        echo ""
        echo "=== FastAPI Logs ==="
        pm2 logs fastapi --lines 5 --nostream
        
        echo ""
        echo "=== Caddy Logs ==="
        sudo journalctl -u caddy --lines 5 --no-pager
ENDSSH
}

# Function to restart all services
restart_all() {
    print_status "Restarting all services..."
    
    ssh -i "$KEY_PATH" "$SERVER_HOST" << 'ENDSSH'
        echo "Restarting PM2 services..."
        pm2 restart all
        
        echo "Restarting FastAPI service..."
        pm2 restart fastapi
        
        echo "Restarting Caddy service..."
        sudo systemctl restart caddy
        
        echo "All services restarted!"
ENDSSH
    
    print_success "All services restarted successfully!"
}

# Function to stop all services
stop_all() {
    print_status "Stopping all services..."
    
    ssh -i "$KEY_PATH" "$SERVER_HOST" << 'ENDSSH'
        echo "Stopping PM2 services..."
        pm2 stop all
        
        echo "Stopping FastAPI service..."
        sudo systemctl stop fastapi
        
        echo "Note: Caddy will continue running to serve static content"
        echo "To stop Caddy too, run: sudo systemctl stop caddy"
ENDSSH
    
    print_success "Services stopped successfully!"
}

# Function to show help
show_help() {
    echo "SemesterSaat Deployment Manager"
    echo ""
    echo "Usage: $0 [command] [service]"
    echo ""
    echo "Commands:"
    echo "  all           Deploy all services (backend, fastapi, frontend)"
    echo "  backend       Deploy only backend service"
    echo "  frontend      Deploy only frontend service"
    echo "  fastapi       Deploy only FastAPI service"
    echo "  status        Show status of all services"
    echo "  logs          Show recent logs from all services"
    echo "  restart       Restart all services"
    echo "  stop          Stop all services"
    echo "  help          Show this help message"
    echo ""
    echo "Individual service management:"
    echo "  ./deploy-backend.sh [deploy|logs|status]"
    echo "  ./deploy-frontend.sh [deploy|logs|status]"
    echo "  ./deploy-fastapi.sh [deploy|logs|status|test]"
    echo ""
    echo "Examples:"
    echo "  $0 all                    # Deploy all services"
    echo "  $0 backend                # Deploy only backend"
    echo "  $0 status                 # Check all services status"
    echo "  ./deploy-backend.sh logs  # View backend logs"
}

# Main function
main() {
    # Make individual scripts executable
    make_scripts_executable
    
    case "${1:-help}" in
        "all")
            deploy_all
            ;;
        "backend")
            print_status "Deploying backend service..."
            ./deploy-backend.sh deploy
            ;;
        "frontend")
            print_status "Deploying frontend service..."
            ./deploy-frontend.sh deploy
            ;;
        "fastapi")
            print_status "Deploying FastAPI service..."
            ./deploy-fastapi.sh deploy
            ;;
        "status")
            show_all_status
            ;;
        "logs")
            show_all_logs
            ;;
        "restart")
            restart_all
            ;;
        "stop")
            stop_all
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
