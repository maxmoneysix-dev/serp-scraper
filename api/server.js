/**
 * SERP Scraper API Server - Node.js/Hono Backend
 * Real Google SERP scraping with Proxies.sx integration
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { HTTPException } from 'hono/http-exception';

const app = new Hono();

// Configuration
const PORT = process.env.PORT || 3000;
const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;
const PROXIES_SX_API_KEY = process.env.PROXIES_SX_API_KEY || 'free_trial';
const X402_PRIVATE_KEY = process.env.X402_PRIVATE_KEY;
const X402_RECEIVER = process.env.X402_RECEIVER_ADDRESS;

// Dynamic import for serp scraper
async function getScraper() {
  try {
    const scraper = await import('./serp-scraper.js');
    return scraper;
  } catch (e) {
    console.error('Failed to load scraper:', e.message);
    return null;
  }
}

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));
app.use('*', prettyJSON());

// Health check
app.get('/health', async (c) => {
  return c.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      api: true,
      ai_engine: !!MOONSHOT_API_KEY,
      x402: !!X402_PRIVATE_KEY && !!X402_RECEIVER,
      proxies_sx: PROXIES_SX_API_KEY !== 'free_trial' ? 'active' : 'free_trial',
      note: 'Vercel serverless - real browser scraping requires Render/Railway/Fly.io'
    }
  });
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'SERP Scraper API',
    version: '1.0.0',
    description: 'AI-powered Google SERP scraping',
    features: ['Organic Results', 'AI Overviews', 'Featured Snippets', 'People Also Ask'],
    endpoints: {
      health: '/health',
      search: { path: '/search', method: 'POST' }
    },
    deployment: {
      current: 'vercel-serverless',
      limitations: 'No Chrome browser - use VPS for real scraping',
      alternatives: ['Render', 'Railway', 'Fly.io', 'AWS EC2']
    }
  });
});

// Search endpoint
app.post('/search', async (c) => {
  try {
    const body = await c.req.json();
    const { query, limit = 10 } = body;
    
    if (!query) {
      throw new HTTPException(400, { message: 'Query is required' });
    }
    
    console.log(`🔍 Search: "${query}"`);
    
    // Get scraper module
    const scraper = await getScraper();
    if (scraper && scraper.scrapeGoogleSERP) {
      const results = await scraper.scrapeGoogleSERP(query, { limit });
      return c.json(results);
    }
    
    // Fallback response
    return c.json({
      success: true,
      query,
      engine: 'demo',
      timestamp: new Date().toISOString(),
      note: 'Running on Vercel serverless - Chrome browser not available',
      message: 'For real Google SERP scraping, deploy to: Render, Railway, Fly.io, or a VPS',
      organic_results: [
        {
          position: 1,
          title: `${query} - Example Result`,
          url: `https://example.com/search?q=${encodeURIComponent(query)}`,
          snippet: `This is demo mode. Real scraping requires Chrome browser which is not available in Vercel serverless.`
        }
      ]
    });
    
  } catch (error) {
    console.error('Search error:', error);
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

console.log(`🚀 SERP Scraper API starting on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
