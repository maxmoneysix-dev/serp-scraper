/**
 * MCP Proxy Server
 * Bridges local thin client to cloud MCP servers
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';

const app = new Hono();
app.use('*', logger());

// MCP server registry
const mcpServers = {
  'proxies-sx': process.env.PROXIES_SX_MCP_URL || 'http://localhost:3002',
  'github': process.env.GITHUB_MCP_URL || 'npx:@modelcontextprotocol/server-github',
  'filesystem': process.env.FILESYSTEM_MCP_URL || 'npx:@modelcontextprotocol/server-filesystem',
  'brave-search': process.env.BRAVE_MCP_URL || 'npx:@modelcontextprotocol/server-brave-search',
  'fetch': process.env.FETCH_MCP_URL || 'npx:@modelcontextprotocol/server-fetch',
};

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    servers: Object.keys(mcpServers),
  });
});

// List available MCP servers
app.get('/servers', (c) => {
  return c.json({
    servers: Object.keys(mcpServers),
    registry: mcpServers,
  });
});

// Proxy call to MCP server
app.post('/call/:server/:tool', async (c) => {
  const server = c.req.param('server');
  const tool = c.req.param('tool');
  const params = await c.req.json();
  
  const serverUrl = mcpServers[server];
  if (!serverUrl) {
    return c.json({ error: `Unknown MCP server: ${server}` }, 404);
  }
  
  // For npx-based servers, we'd need to spawn processes
  // For now, just return a mock response
  if (serverUrl.startsWith('npx:')) {
    return c.json({
      server,
      tool,
      params,
      result: `Would call: ${serverUrl} with tool ${tool}`,
      note: 'NPX MCP servers require local execution'
    });
  }
  
  // Proxy to remote MCP server
  try {
    const response = await fetch(`${serverUrl}/${tool}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    const result = await response.json();
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Execute npx MCP server tool
app.post('/exec/:server/:tool', async (c) => {
  const server = c.req.param('server');
  const tool = c.req.param('tool');
  const params = await c.req.json();
  
  // This would spawn the npx process and communicate via stdio
  // Simplified implementation
  return c.json({
    server,
    tool,
    params,
    note: 'Direct npx execution not implemented in proxy mode',
    suggestion: 'Use direct MCP client for npx servers'
  });
});

const PORT = process.env.PORT || 3001;

console.log(`🔄 MCP Proxy Server running on port ${PORT}`);
console.log(`📡 Registered servers: ${Object.keys(mcpServers).join(', ')}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
