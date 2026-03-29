#!/usr/bin/env node
/**
 * Auto-deploy to Render using Playwright
 * This script automates the Render dashboard to deploy the blueprint
 */

const { chromium } = require('playwright');

const GITHUB_REPO = 'maxmoneysix-dev/serp-scraper';
const RENDER_BLUEPRINT_URL = 'https://dashboard.render.com/blueprints';

async function deploy() {
  console.log('🚀 Starting automated Render deployment...');
  
  const browser = await chromium.launch({ 
    headless: false, // Set to true for production
    slowMo: 100 
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Go to Render blueprints
    console.log('Opening Render dashboard...');
    await page.goto(RENDER_BLUEPRINT_URL);
    
    // Wait for either login or dashboard
    console.log('Waiting for page to load...');
    await page.waitForTimeout(3000);
    
    // Check if login is needed
    const loginButton = await page.$('text=Log In');
    if (loginButton) {
      console.log('⚠️  Please log in to Render manually');
      console.log('   Waiting for login... (60 seconds)');
      
      // Wait for navigation to dashboard after login
      await page.waitForNavigation({ timeout: 60000 });
    }
    
    // Click "New Blueprint Instance"
    console.log('Looking for New Blueprint Instance button...');
    await page.waitForSelector('text=New Blueprint Instance', { timeout: 10000 });
    await page.click('text=New Blueprint Instance');
    
    // Wait for GitHub connection
    console.log('Connecting GitHub repository...');
    await page.waitForTimeout(2000);
    
    // Search for the repo
    await page.fill('[placeholder*="Search"]', 'serp-scraper');
    await page.waitForTimeout(1000);
    
    // Click on the repo
    await page.click(`text=${GITHUB_REPO}`);
    await page.waitForTimeout(2000);
    
    // Wait for render.yaml detection
    console.log('Waiting for render.yaml detection...');
    await page.waitForSelector('text=serp-api-server', { timeout: 30000 });
    await page.waitForSelector('text=serp-ai-engine', { timeout: 10000 });
    
    // Click deploy
    console.log('Deploying services...');
    await page.click('text=Deploy');
    
    // Wait for deployment to start
    console.log('Waiting for deployment to start...');
    await page.waitForTimeout(5000);
    
    // Get the URLs
    console.log('Getting service URLs...');
    await page.goto('https://dashboard.render.com/web');
    await page.waitForTimeout(3000);
    
    const services = await page.$$eval('a[href*=".onrender.com"]', links => 
      links.map(link => ({
        name: link.textContent.trim(),
        url: link.href
      }))
    );
    
    console.log('\n✅ Deployment initiated!');
    console.log('\nServices:');
    services.forEach(s => console.log(`  - ${s.name}: ${s.url}`));
    
    console.log('\n⏳ Deployment takes ~5-10 minutes...');
    console.log('   Check status at: https://dashboard.render.com/web');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n⚠️  Manual deployment required:');
    console.log('   1. Go to https://dashboard.render.com/blueprints');
    console.log('   2. Click "New Blueprint Instance"');
    console.log('   3. Select: maxmoneysix-dev/serp-scraper');
    console.log('   4. Click "Deploy"');
  } finally {
    // Keep browser open for verification
    console.log('\nPress Ctrl+C to close browser when done');
    await new Promise(() => {});
  }
}

deploy();
