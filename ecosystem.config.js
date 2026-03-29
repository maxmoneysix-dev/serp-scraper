module.exports = {
  apps: [
    {
      name: 'serp-api',
      script: './api/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_file: './logs/api.log',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      autorestart: true,
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
    {
      name: 'serp-ai-engine',
      script: './api/main.py',
      interpreter: 'python',
      args: '-m uvicorn api.main:app --host 0.0.0.0 --port 8000',
      instances: 1,
      env: {
        PYTHONUNBUFFERED: '1',
        PORT: 8000
      },
      log_file: './logs/ai-engine.log',
      error_file: './logs/ai-engine-error.log',
      out_file: './logs/ai-engine-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '2G',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      autorestart: true,
    },
    {
      name: 'mcp-proxy',
      script: './mcp/proxy-server.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      log_file: './logs/mcp-proxy.log',
      max_memory_restart: '512M',
      autorestart: true,
    }
  ],
  
  deploy: {
    production: {
      user: 'ubuntu',
      host: ['your-server-1', 'your-server-2'],
      ref: 'origin/main',
      repo: 'https://github.com/maxmoneysix-dev/serp-scraper.git',
      path: '/home/ubuntu/serp-scraper',
      'post-deploy': 'npm install && pip install -r requirements.txt && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get update && apt-get install -y git nodejs python3 python3-pip'
    }
  }
};
