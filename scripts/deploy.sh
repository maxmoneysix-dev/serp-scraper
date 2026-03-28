#!/bin/bash
# SERP Scraper Deployment Script
# Deploys the full stack to Oracle Cloud Free Tier

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="serp-scraper"
ORACLE_USER="ubuntu"
SSH_KEY="$HOME/.ssh/oracle_id_rsa"
COMPOSE_FILE="docker-compose.yml"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    command -v docker >/dev/null 2>&1 || error "Docker is not installed"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is not installed"
    command -v git >/dev/null 2>&1 || error "Git is not installed"
    
    success "All prerequisites met"
}

# Build images
build_images() {
    log "Building Docker images..."
    
    docker-compose -f $COMPOSE_FILE build --no-cache || error "Failed to build images"
    
    success "Images built successfully"
}

# Local deployment
local_deploy() {
    log "Deploying locally with Docker Compose..."
    
    # Create necessary directories
    mkdir -p logs data nginx/ssl
    
    # Stop existing containers
    docker-compose -f $COMPOSE_FILE down --remove-orphans 2>/dev/null || true
    
    # Start services
    docker-compose -f $COMPOSE_FILE up -d
    
    # Wait for health checks
    log "Waiting for services to be healthy..."
    sleep 10
    
    # Check health
    if curl -s http://localhost:8000/health > /dev/null; then
        success "AI Engine is healthy"
    else
        warn "AI Engine health check failed"
    fi
    
    if curl -s http://localhost:3000/health > /dev/null; then
        success "API Server is healthy"
    else
        warn "API Server health check failed"
    fi
    
    success "Local deployment complete!"
    log "API available at: http://localhost:3000"
    log "AI Engine available at: http://localhost:8000"
}

# Oracle Cloud deployment
oracle_deploy() {
    log "Deploying to Oracle Cloud..."
    
    # Check Oracle CLI
    if ! command -v oci &> /dev/null; then
        error "Oracle CLI not installed. Run: bash -c \"\$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)\""
    fi
    
    # Get VM IPs (you need to configure these)
    AI_ENGINE_IP=$(oci compute instance list --compartment-id "$ORACLE_COMPARTMENT_ID" --display-name "serp-ai-engine" --query "data[0].\"primary-public-ip\"" --raw-output 2>/dev/null || echo "")
    API_SERVER_IP=$(oci compute instance list --compartment-id "$ORACLE_COMPARTMENT_ID" --display-name "serp-api-server" --query "data[0].\"primary-public-ip\"" --raw-output 2>/dev/null || echo "")
    
    if [ -z "$AI_ENGINE_IP" ] || [ -z "$API_SERVER_IP" ]; then
        error "Could not find Oracle VMs. Make sure they are provisioned."
    fi
    
    log "AI Engine IP: $AI_ENGINE_IP"
    log "API Server IP: $API_SERVER_IP"
    
    # Deploy to AI Engine VM
    log "Deploying to AI Engine VM..."
    ssh -i "$SSH_KEY" "$ORACLE_USER@$AI_ENGINE_IP" "mkdir -p ~/serp-scraper" || error "Cannot SSH to AI Engine"
    
    rsync -avz -e "ssh -i $SSH_KEY" \
        --exclude='.git' \
        --exclude='__pycache__' \
        --exclude='node_modules' \
        --exclude='data/*' \
        ./ "$ORACLE_USER@$AI_ENGINE_IP:~/serp-scraper/"
    
    ssh -i "$SSH_KEY" "$ORACLE_USER@$AI_ENGINE_IP" "cd ~/serp-scraper && docker-compose -f docker-compose.yml up -d ai-engine" || error "Failed to start AI Engine"
    
    # Deploy to API Server VM
    log "Deploying to API Server VM..."
    ssh -i "$SSH_KEY" "$ORACLE_USER@$API_SERVER_IP" "mkdir -p ~/serp-scraper" || error "Cannot SSH to API Server"
    
    rsync -avz -e "ssh -i $SSH_KEY" \
        --exclude='.git' \
        --exclude='__pycache__' \
        --exclude='node_modules' \
        --exclude='data/*' \
        --exclude='ai/' \
        --exclude='browser/' \
        ./ "$ORACLE_USER@$API_SERVER_IP:~/serp-scraper/"
    
    ssh -i "$SSH_KEY" "$ORACLE_USER@$API_SERVER_IP" "cd ~/serp-scraper && docker-compose -f docker-compose.yml up -d api-server redis nginx" || error "Failed to start API Server"
    
    success "Oracle Cloud deployment complete!"
}

# Setup Oracle VMs
setup_oracle() {
    log "Setting up Oracle Cloud VMs..."
    
    # This would contain the OCI CLI commands to provision VMs
    # For now, just a placeholder
    warn "Oracle VM provisioning not automated. Please create VMs manually in Oracle Console."
    log "Required: 2x VM.Standard.E2.1.Micro (Always Free)"
    log "1. serp-ai-engine (Ubuntu 22.04)"
    log "2. serp-api-server (Ubuntu 22.04)"
}

# View logs
view_logs() {
    log "Viewing logs..."
    docker-compose -f $COMPOSE_FILE logs -f --tail=100
}

# Stop services
stop_services() {
    log "Stopping services..."
    docker-compose -f $COMPOSE_FILE down
    success "Services stopped"
}

# Update services
update() {
    log "Updating services..."
    git pull origin main || warn "Could not pull latest code"
    docker-compose -f $COMPOSE_FILE pull
    docker-compose -f $COMPOSE_FILE up -d --build
    success "Services updated"
}

# Main menu
show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  local       Deploy locally with Docker Compose"
    echo "  oracle      Deploy to Oracle Cloud"
    echo "  setup       Setup Oracle Cloud VMs"
    echo "  build       Build Docker images"
    echo "  logs        View container logs"
    echo "  stop        Stop all services"
    echo "  update      Update and restart services"
    echo "  help        Show this help"
}

# Main
main() {
    case "${1:-local}" in
        local)
            check_prerequisites
            build_images
            local_deploy
            ;;
        oracle)
            oracle_deploy
            ;;
        setup)
            setup_oracle
            ;;
        build)
            build_images
            ;;
        logs)
            view_logs
            ;;
        stop)
            stop_services
            ;;
        update)
            update
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: $1"
            ;;
    esac
}

main "$@"
