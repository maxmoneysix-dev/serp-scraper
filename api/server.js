/**
 * SERP Scraper API Server - Node.js/Hono Backend
 * x402 payment integration for monetized API access
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { HTTPException } from 'hono/http-exception';
import { x402Middleware } from '@proxies-sx/x402-hono';

const app = new Hono();

// Configuration
const PORT = process.env.PORT || 3000;
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://ai-engine:8000';
const X402_PRIVATE_KEY = process.env.X402_PRIVATE_KEY;
const X402_RECEIVER = process.env.X402_RECEIVER_ADDRESS;

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));
app.use('*', prettyJSON());

// Request logging middleware
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.url} - ${c.res.status} (${duration}ms)`);
});

// Health check endpoint (no auth/payment required)
app.get('/health', async (c) => {
  try {
    // Check AI engine health
    const aiHealth = await fetch(`${AI_ENGINE_URL}/health`).then(r => r.ok).catch(() => false);
    
    return c.json({
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        api: true,
        ai_engine: aiHealth,
        x402: !!X402_PRIVATE_KEY
      }
    });
  } catch (error) {
    return c.json({
      status: 'degraded',
      error: error.message
    }, 503);
  }
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'SERP Scraper API',
    version: '1.0.0',
    description: 'AI-powered search scraping with x402 monetization',
    endpoints: {
      health: '/health',
      search: {
        basic: { path: '/search', price: '0.00' },
        ai: { path: '/search/ai', price: '0.05' }
      },
      scrape: { path: '/scrape', price: '0.02' }
    },
    documentation: 'https://github.com/yourusername/serp-scraper'
  });
});

// x402 payment middleware configuration
const paymentConfig = {
  privateKey: X402_PRIVATE_KEY,
  receiverAddress: X402_RECEIVER,
  priceInCents: 1, // $0.01
  network: 'base', // Base network for USDC
};

// Search endpoint with x402 payment
app.post('/search', async (c) => {
  try {
    const body = await c.req.json();
    const { query, engine = 'duckduckgo', limit = 10 } = body;
    
    if (!query) {
      throw new HTTPException(400, { message: 'Query is required' });
    }
    
    // Forward to AI engine
    const response = await fetch(`${AI_ENGINE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.AI_ENGINE_API_KEY || 'dev-key'
      },
      body: JSON.stringify({ query, engine, limit })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new HTTPException(response.status, { message: error });
    }
    
    const results = await response.json();
    
    return c.json({
      success: true,
      query,
      engine,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Search error:', error);
    throw new HTTPException(500, { message: error.message });
  }
});

// AI-enhanced search with higher price
app.post('/search/ai', async (c) => {
  try {
    const body = await c.req.json();
    const { query, engine = 'duckduckgo', limit = 10, ai_enhance = true } = body;
    
    if (!query) {
      throw new HTTPException(400, { message: 'Query is required' });
    }
    
    // Forward to AI engine with AI enhancement
    const response = await fetch(`${AI_ENGINE_URL}/search/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.AI_ENGINE_API_KEY || 'dev-key'
      },
      body: JSON.stringify({ query, engine, limit, ai_enhance })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new HTTPException(response.status, { message: error });
    }
    
    const result = await response.json();
    
    return c.json({
      success: true,
      query,
      engine,
      ai_enhanced: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI search error:', error);
    throw new HTTPException(500, { message: error.message });
  }
});

// Scrape endpoint
app.post('/scrape', async (c) => {
  try {
    const body = await c.req.json();
    const { url, wait_for, javascript = true, extract_text = true, extract_links = false } = body;
    
    if (!url) {
      throw new HTTPException(400, { message: 'URL is required' });
    }
    
    // Forward to AI engine
    const response = await fetch(`${AI_ENGINE_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.AI_ENGINE_API_KEY || 'dev-key'
      },
      body: JSON.stringify({ url, wait_for, javascript, extract_text, extract_links })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new HTTPException(response.status, { message: error });
    }
    
    const result = await response.json();
    
    return c.json({
      success: true,
      url,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Scrape error:', error);
    throw new HTTPException(500, { message: error.message });
  }
});

// MCP proxy endpoint
app.post('/mcp/:server/:tool', async (c) => {
  const server = c.req.param('server');
  const tool = c.req.param('tool');
  const params = await c.req.json();
  
  try {
    // Forward to AI engine's MCP proxy
    const response = await fetch(`${AI_ENGINE_URL}/mcp/${server}/${tool}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.AI_ENGINE_API_KEY || 'dev-key'
      },
      body: JSON.stringify(params)
    });
    
    const result = await response.json();
    return c.json(result);
  } catch (error) {
    console.error('MCP error:', error);
    throw new HTTPException(500, { message: error.message });
  }
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  
  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: err.message,
      status: err.status
    }, err.status);
  }
  
  return c.json({
    success: false,
    error: 'Internal server error',
    message: err.message
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not found',
    path: c.req.path
  }, 404);
});

// Start server
console.log(`🚀 Starting SERP Scraper API Server...`);
console.log(`📡 Port: ${PORT}`);
console.log(`🤖 AI Engine: ${AI_ENGINE_URL}`);
console.log(`💰 x402 Enabled: ${!!X402_PRIVATE_KEY}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
