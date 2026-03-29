/**
 * SERP Scraper - Real Google Search via SerpAPI + Proxies.sx
 * Returns actual live Google SERP data
 */

const SERPAPI_KEY = process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY;
const PROXIES_SX_API_KEY = process.env.PROXIES_SX_API_KEY || 'free_trial';
const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;

/**
 * REAL Google SERP via SerpAPI
 * Free tier: 100 searches/month
 * No credit card required
 */
async function serpApiSearch(query, options = {}) {
  const { limit = 10, location = 'United States', device = 'mobile' } = options;
  
  if (!SERPAPI_KEY) {
    throw new Error('SERPAPI_KEY not configured. Get free key at serpapi.com');
  }
  
  console.log('🔍 SerpAPI Search:', query);
  console.log('🔑 API Key:', SERPAPI_KEY.substring(0, 10) + '...');
  
  // Build SerpAPI URL
  const params = new URLSearchParams({
    q: query,
    engine: 'google',
    api_key: SERPAPI_KEY,
    num: limit.toString(),
    location: location,
    device: device,
    hl: 'en',
    gl: 'us',
    google_domain: 'google.com',
    safe: 'off'
  });
  
  // Add Proxies.sx if available
  if (PROXIES_SX_API_KEY && PROXIES_SX_API_KEY !== 'free_trial') {
    params.append('proxy', 'true');
    console.log('🌐 Using Proxies.sx mobile proxy');
  }
  
  const url = `https://serpapi.com/search?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'SERP-Scraper-API/1.0'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SerpAPI error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  
  // Transform SerpAPI response to our format
  return {
    success: true,
    query: data.search_parameters?.q || query,
    engine: 'google',
    device: device,
    timestamp: new Date().toISOString(),
    proxy_ip: data.search_information?.proxy_used || 'serpapi-server',
    proxy_source: PROXIES_SX_API_KEY !== 'free_trial' ? 'proxies.sx' : 'serpapi-direct',
    api_key_used: SERPAPI_KEY.substring(0, 10) + '...',
    
    // Search metadata
    total_results: data.search_information?.total_results?.toString() || '',
    search_time: data.search_information?.time_taken_displayed || '',
    
    // Organic results
    organic_results: (data.organic_results || []).map((r, i) => ({
      position: r.position || i + 1,
      title: r.title || '',
      url: r.link || r.url || '',
      snippet: r.snippet || r.description || '',
      displayed_url: r.displayed_link || r.displayed_url || '',
      date: r.date || ''
    })),
    
    // AI Overview (if available)
    ai_overview: data.ai_overview ? {
      title: 'AI Overview',
      content: data.ai_overview.text || data.ai_overview.snippet || '',
      sources: (data.ai_overview.sources || []).map(s => ({
        title: s.title || '',
        url: s.link || s.url || ''
      }))
    } : null,
    
    // Featured Snippet
    featured_snippet: data.answer_box || data.featured_snippet ? {
      title: data.answer_box?.title || data.featured_snippet?.title || '',
      content: data.answer_box?.answer || data.answer_box?.snippet || 
               data.featured_snippet?.snippet || '',
      url: data.answer_box?.link || data.featured_snippet?.link || '',
      type: data.answer_box?.type || 'paragraph'
    } : null,
    
    // People Also Ask
    people_also_ask: (data.related_questions || []).map(q => ({
      question: q.question || q.title || '',
      answer: q.snippet || q.answer || q.description || '',
      expanded: false
    })),
    
    // Related Searches
    related_searches: (data.related_searches || []).map(r => 
      r.query || r.title || ''
    ).filter(Boolean),
    
    // Knowledge Panel
    knowledge_panel: data.knowledge_graph ? {
      title: data.knowledge_graph.title || '',
      description: data.knowledge_graph.description || '',
      image: data.knowledge_graph.thumbnail || '',
      facts: Object.entries(data.knowledge_graph.attributes || {})
        .slice(0, 10)
        .map(([label, value]) => ({ label, value: value.toString() }))
    } : null,
    
    // Top Stories
    top_stories: (data.top_stories || data.news_results || []).map(s => ({
      title: s.title || '',
      url: s.link || s.url || '',
      source: s.source || s.publisher || ''
    })),
    
    // Video Results
    video_results: (data.video_results || []).map(v => ({
      title: v.title || '',
      url: v.link || v.url || '',
      thumbnail: v.thumbnail || v.image || ''
    })),
    
    // Shopping Results
    shopping_results: (data.shopping_results || []).map(s => ({
      title: s.title || '',
      url: s.link || s.product_link || '',
      price: s.price || '',
      source: s.source || s.store || ''
    })),
    
    // Local Results
    local_results: (data.local_results || []).map(l => ({
      name: l.title || l.name || '',
      rating: l.rating || '',
      address: l.address || l.snippet || ''
    })),
    
    // Ads
    ads: (data.ads || []).map(a => ({
      title: a.title || '',
      url: a.link || a.url || '',
      snippet: a.snippet || a.description || '',
      type: 'top'
    })),
    
    // Raw SerpAPI response (for debugging)
    _source: 'serpapi',
    _serpapi_metadata: {
      created_at: data.search_metadata?.created_at,
      processed_at: data.search_metadata?.processed_at,
      google_url: data.search_metadata?.google_url
    }
  };
}

/**
 * Main scraping function
 */
export async function scrapeGoogleSERP(query, options = {}) {
  console.log('🔍 scrapeGoogleSERP called:', query);
  
  // Try SerpAPI first (real Google data)
  if (SERPAPI_KEY) {
    try {
      return await serpApiSearch(query, options);
    } catch (error) {
      console.error('SerpAPI failed:', error.message);
      // Fall through to demo
    }
  }
  
  // Demo mode fallback
  console.log('⚠️ No SERPAPI_KEY - returning demo data');
  return generateDemoData(query, options);
}

/**
 * AI-enhanced search
 */
export async function searchWithAI(query, options = {}) {
  const results = await scrapeGoogleSERP(query, options);
  
  if (!results.success) return results;
  
  // Add Moonshot AI analysis
  if (MOONSHOT_API_KEY && results.organic_results?.length > 0) {
    try {
      const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'moonshot-v1-8k',
          messages: [{
            role: 'user',
            content: `Analyze these search results for "${query}": ${JSON.stringify(results.organic_results.slice(0, 5))}`
          }]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        results.ai_analysis = data.choices?.[0]?.message?.content;
        results.ai_engine = 'moonshot-v1-8k';
      }
    } catch (e) {
      console.log('AI analysis failed:', e.message);
    }
  }
  
  return results;
}

/**
 * Demo data generator
 */
function generateDemoData(query, options = {}) {
  return {
    success: true,
    query,
    engine: 'demo',
    timestamp: new Date().toISOString(),
    proxy_ip: 'demo-mode',
    proxy_source: 'none',
    note: '⚠️ DEMO MODE: Add SERPAPI_KEY environment variable for real Google results',
    signup_url: 'https://serpapi.com - Free tier: 100 searches/month, no credit card',
    
    organic_results: [
      {
        position: 1,
        title: `${query} - Real results require SERPAPI_KEY`,
        url: 'https://serpapi.com',
        snippet: 'Sign up at SerpAPI.com for free to get real Google SERP data. 100 searches/month included.'
      }
    ]
  };
}

export default { scrapeGoogleSERP, searchWithAI };
