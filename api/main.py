"""
SERP Scraper API - FastAPI Backend
AI-powered search scraping with MCP integration
"""

import os
import json
import asyncio
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from loguru import logger
import uvicorn

# AI Framework imports
try:
    from langchain_moonshot import ChatMoonshot
    from langchain.agents import AgentExecutor, create_react_agent
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    logger.warning("LangChain not available")

try:
    import playwright
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    logger.warning("Playwright not available")

try:
    from duckduckgo_search import DDGS
    DUCKDUCKGO_AVAILABLE = True
except ImportError:
    DUCKDUCKGO_AVAILABLE = False
    logger.warning("DuckDuckGo search not available")

# Configuration
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")
API_KEY = os.getenv("API_KEY", "dev-key")

# Request/Response Models
class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    engine: str = Field(default="duckduckgo", description="Search engine: duckduckgo, google, bing")
    limit: int = Field(default=10, ge=1, le=50, description="Number of results")
    safe_search: bool = Field(default=True, description="Enable safe search")
    ai_enhance: bool = Field(default=False, description="Use AI to enhance results")

class ScrapeRequest(BaseModel):
    url: str = Field(..., description="URL to scrape")
    wait_for: Optional[str] = Field(default=None, description="CSS selector to wait for")
    javascript: bool = Field(default=True, description="Execute JavaScript")
    extract_text: bool = Field(default=True, description="Extract text content")
    extract_links: bool = Field(default=False, description="Extract all links")
    extract_images: bool = Field(default=False, description="Extract images")

class SearchResult(BaseModel):
    title: str
    url: str
    snippet: Optional[str] = None
    position: int
    source: str

class ScrapeResult(BaseModel):
    url: str
    title: Optional[str] = None
    text: Optional[str] = None
    links: Optional[List[Dict[str, str]]] = None
    images: Optional[List[str]] = None
    html: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class HealthResponse(BaseModel):
    status: str
    version: str = "1.0.0"
    services: Dict[str, bool]

# API Key validation
async def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    if x_api_key != API_KEY and API_KEY != "dev-key":
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("🚀 Starting SERP Scraper API...")
    
    # Log available services
    services = {
        "langchain": LANGCHAIN_AVAILABLE,
        "playwright": PLAYWRIGHT_AVAILABLE,
        "duckduckgo": DUCKDUCKGO_AVAILABLE,
    }
    logger.info(f"Services: {services}")
    
    yield
    
    logger.info("🛑 Shutting down SERP Scraper API...")

# Create FastAPI app
app = FastAPI(
    title="SERP Scraper API",
    description="AI-powered search scraping with MCP integration",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint (no auth required)
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        services={
            "langchain": LANGCHAIN_AVAILABLE,
            "playwright": PLAYWRIGHT_AVAILABLE,
            "duckduckgo": DUCKDUCKGO_AVAILABLE,
        }
    )

# Search endpoint
@app.post("/search", response_model=List[SearchResult])
async def search(
    request: SearchRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Perform a search query and return results
    """
    logger.info(f"Search query: {request.query} (engine: {request.engine})")
    
    results = []
    
    if request.engine == "duckduckgo":
        if not DUCKDUCKGO_AVAILABLE:
            raise HTTPException(status_code=503, detail="DuckDuckGo search not available")
        
        try:
            with DDGS() as ddgs:
                search_results = ddgs.text(
                    request.query,
                    max_results=request.limit,
                    safesearch="on" if request.safe_search else "off"
                )
                
                for i, result in enumerate(search_results, 1):
                    results.append(SearchResult(
                        title=result.get("title", ""),
                        url=result.get("href", ""),
                        snippet=result.get("body", ""),
                        position=i,
                        source="duckduckgo"
                    ))
        except Exception as e:
            logger.error(f"DuckDuckGo search error: {e}")
            raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
    
    elif request.engine == "google":
        # TODO: Implement Google search via Playwright or SerpAPI
        raise HTTPException(status_code=501, detail="Google search not yet implemented")
    
    elif request.engine == "bing":
        # TODO: Implement Bing search
        raise HTTPException(status_code=501, detail="Bing search not yet implemented")
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown search engine: {request.engine}")
    
    return results

# Scrape endpoint
@app.post("/scrape", response_model=ScrapeResult)
async def scrape(
    request: ScrapeRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Scrape a specific URL
    """
    logger.info(f"Scraping URL: {request.url}")
    
    if not PLAYWRIGHT_AVAILABLE:
        raise HTTPException(status_code=503, detail="Playwright not available")
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
            page = await context.new_page()
            
            # Navigate to URL
            response = await page.goto(request.url, wait_until="networkidle")
            
            # Wait for specific element if requested
            if request.wait_for:
                await page.wait_for_selector(request.wait_for)
            
            # Extract data
            result = ScrapeResult(url=request.url)
            
            # Title
            result.title = await page.title()
            
            # Text content
            if request.extract_text:
                result.text = await page.evaluate("() => document.body.innerText")
            
            # Links
            if request.extract_links:
                links = await page.evaluate("""
                    () => Array.from(document.querySelectorAll('a[href]'))
                        .map(a => ({text: a.textContent.trim(), href: a.href}))
                        .filter(l => l.href.startsWith('http'))
                """)
                result.links = links[:100]  # Limit to 100 links
            
            # Images
            if request.extract_images:
                images = await page.evaluate("""
                    () => Array.from(document.querySelectorAll('img[src]'))
                        .map(img => img.src)
                        .filter(src => src.startsWith('http'))
                """)
                result.images = images[:50]  # Limit to 50 images
            
            # Metadata
            result.metadata = {
                "status": response.status if response else None,
                "content_type": response.headers.get("content-type") if response else None,
            }
            
            await browser.close()
            
            return result
            
    except Exception as e:
        logger.error(f"Scraping error: {e}")
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

# AI-enhanced search endpoint
@app.post("/search/ai")
async def search_ai(
    request: SearchRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    AI-enhanced search with result analysis
    """
    if not LANGCHAIN_AVAILABLE:
        raise HTTPException(status_code=503, detail="LangChain not available")
    
    # First get search results
    search_results = await search(request, api_key)
    
    # TODO: Use LangChain to analyze and enhance results
    # For now, just return the raw results
    
    return {
        "query": request.query,
        "results": search_results,
        "ai_analysis": "AI enhancement not yet implemented"
    }

# MCP proxy endpoint - forwards to MCP servers
@app.post("/mcp/{server}/{tool}")
async def mcp_proxy(
    server: str,
    tool: str,
    params: Dict[str, Any],
    api_key: str = Depends(verify_api_key)
):
    """
    Proxy to MCP servers
    """
    logger.info(f"MCP call: {server}.{tool}")
    
    # This is a placeholder - actual MCP integration would use the MCP SDK
    # For now, return a mock response
    return {
        "server": server,
        "tool": tool,
        "params": params,
        "result": "MCP integration pending - install MCP SDK"
    }

# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=DEBUG,
        log_level="debug" if DEBUG else "info"
    )
