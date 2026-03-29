#!/bin/bash
# Deploy SERP Scraper to Fly.io
# Fly.io free tier: 3 shared-cpu-1x VMs, 3GB persistent volumes

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }

log "🚀 Deploying SERP Scraper to Fly.io..."

# Check Fly CLI
if ! command -v fly &> /dev/null; then
    log "Installing Fly CLI..."
    curl -L https://fly.io/install.sh | sh
    export PATH="$HOME/.fly/bin:$PATH"
fi

# Check auth
if ! fly auth whoami &> /dev/null; then
    log "Please login to Fly.io:"
    fly auth login
fi

# Deploy API Server
log "Deploying API Server..."
cd "$(dirname "$0")/.."
fly apps create serp-api-server --org personal 2>/dev/null || log "API app exists"
fly deploy --app serp-api-server --dockerfile docker/Dockerfile.api-server

# Deploy AI Engine
log "Deploying AI Engine..."
fly apps create serp-ai-engine --org personal 2>/dev/null || log "AI Engine app exists"
fly deploy --app serp-ai-engine --dockerfile docker/Dockerfile.ai-engine

# Create Redis
log "Setting up Redis..."
fly redis create --name serp-redis --region iad --eviction-policy allkeys-lru 2>/dev/null || log "Redis may exist"

success "Fly.io deployment complete!"
log "API Server: https://serp-api-server.fly.dev"
log "AI Engine: https://serp-ai-engine.fly.dev"
