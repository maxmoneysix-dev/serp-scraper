# 🚀 SERP Scraper - AI-Powered Search API

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/maxmoneysix-dev/serp-scraper)

**Goal:** Win the Proxies.sx $200 SERP scraper bounty and run as a live paid API service earning USDC 24/7.

## 🚀 One-Click Deploy

### Option 1: Render (Easiest - Free Tier)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/maxmoneysix-dev/serp-scraper)

Click the button above and it will:
1. Create 3 services (API server, AI engine, Redis)
2. Auto-configure with your environment variables
3. Deploy in ~5 minutes

**Live URLs after deploy:**
- API: `https://serp-api-server.onrender.com`
- AI Engine: `https://serp-ai-engine.onrender.com`

### Option 2: Fly.io (Free Always-On)
```bash
./scripts/deploy-fly.sh
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           RENDER CLOUD                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────┐      ┌──────────────────────────┐        │
│  │ serp-api-server      │      │ serp-ai-engine           │        │
│  │ - Hono.js API        │◄────►│ - FastAPI                │        │
│  │ - x402 payments      │      │ - Playwright browsers    │        │
│  │ - Redis cache        │      │ - Moonshot AI            │        │
│  └──────────────────────┘      └──────────────────────────┘        │
│           │                                   │                     │
│           └──────────┬────────────────────────┘                     │
│                      ▼                                              │
│              https://*.onrender.com                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Test the API
```bash
# Health check
curl https://serp-api-server.onrender.com/health

# Search
curl -X POST https://serp-api-server.onrender.com/search \
  -H "Content-Type: application/json" \
  -d '{"query": "AI agents", "engine": "duckduckgo"}'
```

## Features

- 🔍 **SERP Scraping** - Google, Bing, DuckDuckGo
- 🤖 **AI Agents** - LangGraph + Moonshot AI
- 🌐 **Browser Automation** - Playwright, Puppeteer
- 💰 **x402 Payments** - Get paid per API call in USDC
- 🔗 **MCP Servers** - GitHub, Filesystem, Brave Search

## API Endpoints

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/health` | GET | Free | Health check |
| `/search` | POST | $0.01 | Basic SERP scrape |
| `/search/ai` | POST | $0.05 | AI-enhanced results |
| `/scrape` | POST | $0.02 | Custom URL scraping |

## Environment Variables

Already configured in `render.yaml`:
- `MOONSHOT_API_KEY` - AI provider
- `PROXIES_SX_API_KEY` - Proxies.sx integration
- `X402_PRIVATE_KEY` - Solana wallet for payments
- `X402_RECEIVER_ADDRESS` - USDC receiver address

## License

MIT - Free to use, modify, and monetize.
