#!/bin/bash
# Deploy SERP Scraper to Render
# Render has a generous free tier!

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }

log "🚀 Deploying SERP Scraper to Render..."

# Instructions
log "Render deployment is done via the render.yaml blueprint"
log ""
log "Steps:"
log "1. Push your code to GitHub:"
log "   git push origin main"
log ""
log "2. Go to https://dashboard.render.com/blueprints"
log "3. Click 'New Blueprint Instance'"
log "4. Connect your GitHub repo"
log "5. Render will auto-detect render.yaml and create:"
log "   - serp-api-server (Node.js)"
log "   - serp-ai-engine (Python)"
log "   - serp-redis (Redis)"
log ""
log "6. Add your environment variables in the Render dashboard:"
log "   - OPENAI_API_KEY or MOONSHOT_API_KEY"
log "   - PROXIES_SX_API_KEY"
log "   - X402_PRIVATE_KEY"
log "   - X402_RECEIVER_ADDRESS"
log ""

success "render.yaml is ready!"
