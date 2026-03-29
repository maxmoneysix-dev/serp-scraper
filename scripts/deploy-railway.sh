#!/bin/bash
# Deploy SERP Scraper to Railway
# Railway offers $5 free credit/month - perfect for this!

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }

log "🚀 Deploying SERP Scraper to Railway..."

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    log "Installing Railway CLI..."
    npm install -g @railway/cli || error "Failed to install Railway CLI"
fi

# Check auth
if ! railway whoami &> /dev/null; then
    log "Please login to Railway:"
    railway login
fi

# Create project if not exists
log "Creating Railway project..."
railway init --name serp-scraper || log "Project may already exist, continuing..."

# Add services
log "Setting up services..."
railway add --service serp-api || log "API service may exist"
railway add --service serp-ai-engine || log "AI Engine service may exist"
railway add --service serp-redis || log "Redis service may exist"

# Set environment variables
log "Configuring environment variables..."
railway variables --service serp-api <<EOF
NODE_ENV=production
PORT=3000
EOF

railway variables --service serp-ai-engine <<EOF
PYTHONUNBUFFERED=1
PORT=8000
EOF

# Deploy
log "Deploying to Railway..."
railway up

success "Deployment complete!"
railway status
