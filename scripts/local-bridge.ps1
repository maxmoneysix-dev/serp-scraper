# SERP Scraper - Thin Local Client Bridge
# <10MB RAM - Connects local machine to cloud AI engine

param(
    [string]$Action = "status",
    [string]$CloudEndpoint = $env:SERP_CLOUD_ENDPOINT,
    [string]$ApiKey = $env:SERP_API_KEY
)

# Default configuration
if (-not $CloudEndpoint) {
    $CloudEndpoint = "http://localhost:3000"  # Local dev fallback
}

if (-not $ApiKey) {
    $ApiKey = "dev-key"
}

$Script:Version = "1.0.0"

# Color output
function Write-Color($Text, $Color = "White") {
    Write-Host $Text -ForegroundColor $Color
}

function Show-Banner {
    Write-Color @"
╔══════════════════════════════════════════════════════════╗
║     🚀 SERP SCRAPER - Thin Local Client Bridge           ║
║     Version $Script:Version - Cloud AI Gateway             ║
╚══════════════════════════════════════════════════════════╝
"@ "Cyan"
}

function Test-Connection {
    try {
        $response = Invoke-RestMethod -Uri "$CloudEndpoint/health" -Method GET -TimeoutSec 5
        Write-Color "✅ Cloud AI Engine: ONLINE" "Green"
        Write-Color "   Version: $($response.version)" "Gray"
        Write-Color "   Services: $(($response.services | ConvertTo-Json -Compress))" "Gray"
        return $true
    }
    catch {
        Write-Color "❌ Cloud AI Engine: OFFLINE" "Red"
        Write-Color "   Error: $($_.Exception.Message)" "Gray"
        return $false
    }
}

function Invoke-Search {
    param([string]$Query, [string]$Engine = "duckduckgo", [int]$Limit = 10)
    
    Write-Color "🔍 Searching: $Query" "Yellow"
    
    $body = @{
        query = $Query
        engine = $Engine
        limit = $Limit
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$CloudEndpoint/search" -Method POST `
            -Headers @{ "X-API-Key" = $ApiKey; "Content-Type" = "application/json" } `
            -Body $body -TimeoutSec 30
        
        Write-Color "✅ Found $($response.results.Count) results" "Green"
        
        $response.results | ForEach-Object {
            Write-Color "   $($_.position). $($_.title)" "White"
            Write-Color "      $($_.url)" "Blue"
            Write-Color "      $($_.snippet)" "Gray"
            Write-Host ""
        }
        
        return $response
    }
    catch {
        Write-Color "❌ Search failed: $($_.Exception.Message)" "Red"
        return $null
    }
}

function Invoke-Scrape {
    param([string]$Url, [switch]$ExtractLinks)
    
    Write-Color "🌐 Scraping: $Url" "Yellow"
    
    $body = @{
        url = $Url
        extract_text = $true
        extract_links = $ExtractLinks.IsPresent
        javascript = $true
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$CloudEndpoint/scrape" -Method POST `
            -Headers @{ "X-API-Key" = $ApiKey; "Content-Type" = "application/json" } `
            -Body $body -TimeoutSec 60
        
        Write-Color "✅ Scraped: $($response.title)" "Green"
        Write-Color "   Text length: $($response.text.Length) chars" "Gray"
        
        if ($ExtractLinks -and $response.links) {
            Write-Color "   Links found: $($response.links.Count)" "Gray"
        }
        
        return $response
    }
    catch {
        Write-Color "❌ Scrape failed: $($_.Exception.Message)" "Red"
        return $null
    }
}

function Invoke-MCP {
    param([string]$Server, [string]$Tool, [hashtable]$Params = @{})
    
    Write-Color "🔗 MCP Call: $Server.$Tool" "Yellow"
    
    $body = $Params | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "$CloudEndpoint/mcp/$Server/$Tool" -Method POST `
            -Headers @{ "X-API-Key" = $ApiKey; "Content-Type" = "application/json" } `
            -Body $body -TimeoutSec 60
        
        Write-Color "✅ MCP Response received" "Green"
        return $response
    }
    catch {
        Write-Color "❌ MCP call failed: $($_.Exception.Message)" "Red"
        return $null
    }
}

function Start-BridgeServer {
    Write-Color "🚀 Starting local bridge server..." "Cyan"
    Write-Color "   This will keep running until you press Ctrl+C" "Gray"
    Write-Host ""
    
    # Simple HTTP listener for local bridge
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:3456/")
    $listener.Start()
    
    Write-Color "✅ Bridge server listening on http://localhost:3456" "Green"
    Write-Color "   Proxying to: $CloudEndpoint" "Gray"
    
    try {
        while ($listener.IsListening) {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            
            $path = $request.Url.LocalPath
            Write-Color "[$($request.HttpMethod)] $path" "DarkGray"
            
            # Health check
            if ($path -eq "/health") {
                $testCloud = Test-Connection
                $result = @{
                    status = "healthy"
                    bridge = "running"
                    cloud = if ($testCloud) { "connected" } else { "disconnected" }
                    timestamp = (Get-Date -Format "o")
                } | ConvertTo-Json
                
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($result)
                $response.ContentType = "application/json"
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            }
            # Proxy all other requests to cloud
            else {
                try {
                    $proxyUrl = "$CloudEndpoint$path"
                    $proxyResponse = Invoke-RestMethod -Uri $proxyUrl -Method $request.HttpMethod `
                        -Headers @{ "X-API-Key" = $ApiKey } -TimeoutSec 60
                    
                    $result = $proxyResponse | ConvertTo-Json -Depth 10
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($result)
                    $response.ContentType = "application/json"
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                }
                catch {
                    $errorResult = @{ error = $_.Exception.Message } | ConvertTo-Json
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($errorResult)
                    $response.StatusCode = 500
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                }
            }
            
            $response.Close()
        }
    }
    finally {
        $listener.Stop()
        Write-Color "🛑 Bridge server stopped" "Yellow"
    }
}

function Show-Help {
    Write-Color @"
Usage: ./scripts/local-bridge.ps1 [Action] [Options]

Actions:
  status        Check connection to cloud AI engine
  search        Perform a search query
  scrape        Scrape a specific URL
  mcp           Call an MCP server tool
  serve         Start local bridge server

Environment Variables:
  SERP_CLOUD_ENDPOINT    Cloud AI engine URL
  SERP_API_KEY          API key for authentication

Examples:
  # Check status
  ./scripts/local-bridge.ps1 status

  # Search
  ./scripts/local-bridge.ps1 search -Query "AI agents"

  # Scrape
  ./scripts/local-bridge.ps1 scrape -Url "https://example.com"

  # MCP Call
  ./scripts/local-bridge.ps1 mcp -Server "fetch" -Tool "fetch" -Params @{ url = "https://api.ipify.org" }
"@ "Cyan"
}

# Main
Show-Banner

switch ($Action.ToLower()) {
    "status" {
        Test-Connection
    }
    "search" {
        # Allow interactive query input
        if ($args.Count -eq 0) {
            $query = Read-Host "Enter search query"
            Invoke-Search -Query $query
        }
        else {
            Invoke-Search -Query $args[0]
        }
    }
    "scrape" {
        if ($args.Count -eq 0) {
            $url = Read-Host "Enter URL to scrape"
            Invoke-Scrape -Url $url
        }
        else {
            Invoke-Scrape -Url $args[0]
        }
    }
    "mcp" {
        Write-Color "MCP calls require -Server, -Tool, and -Params parameters" "Yellow"
    }
    "serve" {
        Start-BridgeServer
    }
    "help" {
        Show-Help
    }
    default {
        Write-Color "Unknown action: $Action" "Red"
        Show-Help
    }
}
