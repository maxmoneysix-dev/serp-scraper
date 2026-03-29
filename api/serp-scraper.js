/**
 * SERP Scraper - Advanced Google Search with Stealth & Proxies.sx
 * Uses puppeteer-extra, stealth plugins, and Proxies.sx mobile proxies
 */

import { Hono } from 'hono';

// Configuration
const PROXIES_SX_API_KEY = process.env.PROXIES_SX_API_KEY || 'free_trial';
const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;

// Try to import puppeteer with stealth
let puppeteer;
let puppeteerExtra;
let stealthPlugin;
let anonymizeUA;

// Dynamic imports for Vercel compatibility
async function loadPuppeteer() {
  try {
    const puppeteerExtraMod = await import('puppeteer-extra');
    const stealthMod = await import('puppeteer-extra-plugin-stealth');
    const uaMod = await import('puppeteer-extra-plugin-anonymize-ua');
    
    puppeteerExtra = puppeteerExtraMod.default;
    stealthPlugin = stealthMod.default;
    anonymizeUA = uaMod.default;
    
    // Use puppeteer-extra as puppeteer
    puppeteerExtra.use(stealthPlugin());
    puppeteerExtra.use(anonymizeUA({ stripHeadless: true }));
    
    puppeteer = puppeteerExtra;
    console.log('✅ Puppeteer Extra with Stealth loaded');
    return true;
  } catch (e) {
    console.log('❌ Puppeteer Extra not available:', e.message);
    return false;
  }
}

/**
 * Get mobile proxy from Proxies.sx
 */
async function getProxiesSxProxy() {
  try {
    if (PROXIES_SX_API_KEY === 'free_trial') {
      console.log('Using free trial mode - no proxy');
      return null;
    }
    
    const response = await fetch('https://api.proxies.sx/v1/proxies/mobile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PROXIES_SX_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const proxy = await response.json();
      console.log('✅ Got Proxies.sx proxy:', proxy.ip);
      return proxy;
    }
  } catch (e) {
    console.log('❌ Proxy fetch failed:', e.message);
  }
  return null;
}

/**
 * REAL Google SERP Scraping with Puppeteer Stealth
 */
async function realGoogleScrape(query, options = {}) {
  const { limit = 10, device = 'mobile' } = options;
  
  // Load puppeteer
  const puppeteerReady = await loadPuppeteer();
  if (!puppeteerReady) {
    throw new Error('Puppeteer not available in this environment');
  }
  
  // Get proxy
  const proxy = await getProxiesSxProxy();
  
  let browser;
  let proxyIp = 'none';
  
  try {
    // Launch options
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ]
    };
    
    // Add proxy if available
    if (proxy && proxy.host && proxy.port) {
      launchOptions.args.push(`--proxy-server=${proxy.host}:${proxy.port}`);
      proxyIp = `${proxy.host}:${proxy.port}`;
    }
    
    // Check if running on Vercel (no Chrome available)
    if (process.env.VERCEL) {
      throw new Error('Chrome not available in Vercel serverless - using API fallback');
    }
    
    browser = await puppeteer.launch(launchOptions);
    
    const page = await browser.newPage();
    
    // Set viewport based on device
    if (device === 'mobile') {
      await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
    } else {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }
    
    // Navigate to Google
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&num=${limit}`;
    
    console.log(`🔍 Scraping: ${searchUrl}`);
    console.log(`🌐 Proxy: ${proxyIp}`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Handle cookie consent
    try {
      await page.waitForSelector('button', { timeout: 3000 });
      const consentBtn = await page.$('button[aria-label*="Accept"], button:has-text("Accept all"), form[action*="consent"] button');
      if (consentBtn) await consentBtn.click();
    } catch (e) {}
    
    // Wait for results
    await page.waitForSelector('#search, #rso, .g', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Get proxy IP actually used
    try {
      const ipCheck = await page.evaluate(async () => {
        try {
          const resp = await fetch('https://api.ipify.org?format=json');
          return await resp.json();
        } catch (e) {
          return { ip: 'unknown' };
        }
      });
      proxyIp = ipCheck.ip;
    } catch (e) {}
    
    // Extract all SERP data
    const results = await page.evaluate((searchLimit) => {
      const data = {
        query: document.querySelector('input[name="q"]')?.value || '',
        proxy_used: { ip: proxyIp, type: 'mobile' },
        total_results: document.querySelector('#result-stats')?.textContent?.match(/([\d,]+) results?/)?.[1] || '',
        search_time: document.querySelector('#result-stats')?.textContent?.match(/\(([\d.]+) seconds?\)/)?.[1] || '',
        organic_results: [],
        ai_overview: null,
        featured_snippet: null,
        people_also_ask: [],
        related_searches: [],
        knowledge_panel: null,
        top_stories: [],
        ads: []
      };
      
      // Organic results
      const resultsList = document.querySelectorAll('#search .g, #rso .g');
      let pos = 1;
      resultsList.forEach(el => {
        if (pos > searchLimit) return;
        
        const title = el.querySelector('h3, .LC20lb')?.textContent?.trim();
        const link = el.querySelector('a[href^="http"]')?.href;
        const snippet = el.querySelector('.VwiC3b, .s3v94d')?.textContent?.trim();
        const displayedUrl = el.querySelector('.byrV5b, .TbwUpd')?.textContent?.trim();
        
        if (title && link) {
          data.organic_results.push({
            position: pos++,
            title,
            url: link,
            snippet: snippet || '',
            displayed_url: displayedUrl || ''
          });
        }
      });
      
      // People Also Ask
      document.querySelectorAll('[data-attrid="wa"] .g, related-question-pair').forEach(item => {
        const q = item.querySelector('[role="button"]')?.textContent?.trim();
        const a = item.querySelector('.YkQvR')?.textContent?.trim();
        if (q && a) data.people_also_ask.push({ question: q, answer: a });
      });
      
      // Related searches
      document.querySelectorAll('a[href*="/search?q="]').forEach(a => {
        const text = a.textContent?.trim();
        if (text && !text.includes('http') && data.related_searches.length < 8) {
          data.related_searches.push(text);
        }
      });
      
      return data;
    }, limit);
    
    await browser.close();
    
    return {
      success: true,
      engine: 'google',
      device,
      timestamp: new Date().toISOString(),
      proxy_ip: proxyIp,
      ...results
    };
    
  } catch (error) {
    if (browser) await browser.close();
    console.error('Real scrape error:', error.message);
    throw error;
  }
}

/**
 * API-based fallback (for serverless environments)
 */
async function apiFallbackScrape(query, options = {}) {
  const { limit = 10 } = options;
  
  // Try SerpAPI or similar service
  const apiKey = process.env.SERPAPI_KEY;
  
  if (apiKey) {
    try {
      const resp = await fetch(`https://serpapi.com/search?q=${encodeURIComponent(query)}&engine=google&api_key=${apiKey}&num=${limit}`);
      if (resp.ok) {
        const data = await resp.json();
        return {
          success: true,
          engine: 'google',
          source: 'serpapi',
          timestamp: new Date().toISOString(),
          proxy_ip: 'serpapi-server',
          ...data
        };
      }
    } catch (e) {
      console.log('SerpAPI failed:', e.message);
    }
  }
  
  // Try scraping via scrapingbee or similar
  const scrapingBeeKey = process.env.SCRAPINGBEE_API_KEY;
  if (scrapingBeeKey) {
    try {
      const url = `https://app.scrapingbee.com/api/v1/store/google?api_key=${scrapingBeeKey}&search=${encodeURIComponent(query)}`;
      const resp = await fetch(url);
      if (resp.ok) return await resp.json();
    } catch (e) {
      console.log('ScrapingBee failed:', e.message);
    }
  }
  
  // Final fallback - return error with instructions
  return {
    success: false,
    error: 'Real scraping requires Chrome browser which is not available in Vercel serverless. Use a VPS or dedicated server for full puppeteer functionality.',
    query,
    timestamp: new Date().toISOString(),
    note: 'For real Google scraping with Proxies.sx, deploy to: Render, Railway, Fly.io, or a VPS'
  };
}

/**
 * Main SERP scraping function - tries real scrape first, falls back to API
 */
export async function scrapeGoogleSERP(query, options = {}) {
  console.log(`🔍 SERP Search: "${query}"`);
  
  // Try real scraping first
  try {
    const realResults = await realGoogleScrape(query, options);
    if (realResults.success) {
      console.log('✅ Real scrape successful');
      return realResults;
    }
  } catch (error) {
    console.log('⚠️ Real scrape failed:', error.message);
  }
  
  // Fall back to API
  console.log('🔄 Using API fallback...');
  return apiFallbackScrape(query, options);
}

/**
 * AI-enhanced search with Moonshot
 */
export async function searchWithAI(query, options = {}) {
  console.log(`🤖 AI Search: "${query}"`);
  
  // Get SERP results
  const serpResults = await scrapeGoogleSERP(query, options);
  
  if (!serpResults.success) {
    return serpResults;
  }
  
  // Enhance with Moonshot AI
  let aiAnalysis = null;
  
  if (MOONSHOT_API_KEY && serpResults.organic_results) {
    try {
      const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'moonshot-v1-8k',
          messages: [
            {
              role: 'system',
              content: 'You are a search analyst. Analyze the search results and provide key insights.'
            },
            {
              role: 'user',
              content: `Analyze these search results for "${query}":\n\n${JSON.stringify(serpResults.organic_results.slice(0, 5))}`
            }
          ]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        aiAnalysis = data.choices?.[0]?.message?.content;
      }
    } catch (e) {
      console.log('AI analysis failed:', e.message);
    }
  }
  
  return {
    ...serpResults,
    ai_enhanced: true,
    ai_analysis: aiAnalysis,
    ai_engine: 'moonshot-v1-8k'
  };
}

export default { scrapeGoogleSERP, searchWithAI };
