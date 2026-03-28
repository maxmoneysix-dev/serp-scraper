# 🚀 SERP Scraper - AI-Powered Search API

**Goal:** Win the Proxies.sx $200 SERP scraper bounty and run as a live paid API service earning USDC 24/7.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           LOCAL (Dell)                              │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ Thin MCP Client Bridge (10MB RAM)                        │      │
│  └──────────────────────┬───────────────────────────────────┘      │
└─────────────────────────┼───────────────────────────────────────────┘
                          │ WireGuard/HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ORACLE CLOUD FREE TIER                          │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ VM 1: AI Agent Engine (24/7)                             │      │
│  │ - FastAPI + Composio Gateway                             │      │
│  │ - Playwright cluster (4 browsers)                        │      │
│  │ - MCP Server Hub                                         │      │
│  └──────────────────────────────────────────────────────────┘      │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ VM 2: API Server + x402 Payments (24/7)                  │      │
│  │ - Hono.js API with x402 monetization                     │      │
│  │ - DuckDB for scraped data                                │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt
npm install

# Run local API
python -m uvicorn api.main:app --reload
```

### Deploy to Oracle Cloud
```bash
# Bootstrap from GitHub Codespace
./scripts/deploy.sh
```

## Features

- 🔍 **SERP Scraping** - Google, Bing, DuckDuckGo
- 🤖 **AI Agents** - LangGraph + CrewAI orchestration
- 🌐 **Browser Automation** - Playwright, CamouFox, Puppeteer
- 💰 **x402 Payments** - Get paid per API call in USDC
- 🔗 **MCP Servers** - GitHub, Filesystem, Brave Search
- 🐳 **Docker Deploy** - One-command deployment

## API Endpoints

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/search` | POST | $0.01 | Basic SERP scrape |
| `/search/ai` | POST | $0.05 | AI-enhanced results |
| `/scrape` | POST | $0.02 | Custom URL scraping |

## Environment Variables

Copy `.env.template` to `.env` and fill in your keys.

## License

MIT - Free to use, modify, and monetize.
