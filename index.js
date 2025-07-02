const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Store configuration mapping domains to store names and secrets
const STORE_CONFIG = {
  // US Stores
  'your-us-store.myshopify.com': {
    storeName: 'US_Live',
    webhookSecret: process.env.US_WEBHOOK_SECRET
  },
  
  // UK Stores  
  'your-uk-store.myshopify.com': {
    storeName: 'UK_Live',
    webhookSecret: process.env.UK_WEBHOOK_SECRET
  },
  
  // EU Stores
  'your-eu-store.myshopify.com': {
    storeName: 'EU_Live', 
    webhookSecret: process.env.EU_WEBHOOK_SECRET
  },
  
  // German Stores
  'your-ger-store.myshopify.com': {
    storeName: 'GER_Live',
    webhookSecret: process.env.GER_WEBHOOK_SECRET
  },
  
  // GCC Stores
  'your-gcc-store.myshopify.com': {
    storeName: 'GCC_Live',
    webhookSecret: process.env.GCC_WEBHOOK_SECRET
  },
  
  // Australia Stores
  'your-aus-store.myshopify.com': {
    storeName: 'AUS_Live',
    webhookSecret: process.env.AUS_WEBHOOK_SECRET
  },
  
  // Singapore Stores
  'your-sing-store.myshopify.com': {
    storeName: 'SING_Live',
    webhookSecret: process.env.SING_WEBHOOK_SECRET
  },
  
  // France Stores
  'your-fr-store.myshopify.com': {
    storeName: 'FR_Live',
    webhookSecret: process.env.FR_WEBHOOK_SECRET
  },
  
  // ROW Stores
  'your-row-store.myshopify.com': {
    storeName: 'ROW_Live',
    webhookSecret: process.env.ROW_WEBHOOK_SECRET
  },
  
  // Add staging stores as well
  'your-us-staging.myshopify.com': {
    storeName: 'US_Staging',
    webhookSecret: process.env.US_STAGING_WEBHOOK_SECRET
  },
  
  'your-uk-staging.myshopify.com': {
    storeName: 'UK_Staging',
    webhookSecret: process.env.UK_STAGING_WEBHOOK_SECRET
  },
  
  'your-eu-staging.myshopify.com': {
    storeName: 'EU_Staging',
    webhookSecret: process.env.EU_STAGING_WEBHOOK_SECRET
  },
  
  'your-ger-staging.myshopify.com': {
    storeName: 'GER_Staging',
    webhookSecret: process.env.GER_STAGING_WEBHOOK_SECRET
  },
  
  'your-gcc-staging.myshopify.com': {
    storeName: 'GCC_Staging',
    webhookSecret: process.env.GCC_STAGING_WEBHOOK_SECRET
  },
  
  'your-aus-staging.myshopify.com': {
    storeName: 'AUS_Staging',
    webhookSecret: process.env.AUS_STAGING_WEBHOOK_SECRET
  },
  
  'your-row-staging.myshopify.com': {
    storeName: 'ROW_Staging',
    webhookSecret: process.env.ROW_STAGING_WEBHOOK_SECRET
  },
  
  'your-sing-staging.myshopify.com': {
    storeName: 'SINGA_Staging',
    webhookSecret: process.env.SINGA_STAGING_WEBHOOK_SECRET
  },
  
  'your-fr-staging.myshopify.com': {
    storeName: 'FR_Staging',
    webhookSecret: process.env.FR_STAGING_WEBHOOK_SECRET
  }
};

// Google Apps Script Web App URL
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

// Middleware
app.use(helmet());
app.use(cors());

// Raw body parser for webhook verification
app.use('/webhook', express.raw({ type: 'application/json' }));

// Regular JSON parser for other routes
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * Verify Shopify webhook signature
 */
function verifyShopifyWebhook(data, signature, secret) {
  if (!signature || !secret) {
    console.log('Missing signature or secret');
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data, 'utf8');
  const calculatedSignature = hmac.digest('base64');

  // Remove 'sha256=' prefix from Shopify signature
  const shopifySignature = signature.replace('sha256=', '');

  const result = crypto.timingSafeEqual(
    Buffer.from(calculatedSignature),
    Buffer.from(shopifySignature)
  );

  console.log('Webhook verification result:', result);
  return result;
}

/**
 * Extract store domain from Shopify headers
 */
function getStoreDomain(req) {
  // Try to get domain from Shopify headers
  const shopDomain = req.get('X-Shopify-Shop-Domain') || 
                    req.get('X-Shopify-Shop') ||
                    req.body?.domain;
  
  console.log('Extracted shop domain:', shopDomain);
  return shopDomain;
}

/**
 * Get updated files from Shopify theme
 */
async function getUpdatedThemeFiles(storeName, themeId, lastUpdated) {
  try {
    console.log(`Getting updated files for theme ${themeId} in store ${storeName}`);
    
    // You would need to implement this based on your store's access tokens
    // This is a placeholder for the actual implementation
    const storeConfig = Object.values(STORE_CONFIG).find(config => config.storeName === storeName);
    if (!storeConfig) {
      throw new Error(`Store configuration not found for ${storeName}`);
    }

    // This would require Shopify API access - you'll need to implement based on your access tokens
    // For now, returning a mock response
    const updatedFiles = [
      'templates/collection.round-tt-table.json',
      'templates/collection.tt-table.json'
    ];
    
    console.log(`Found ${updatedFiles.length} updated files:`, updatedFiles);
    return updatedFiles;
    
  } catch (error) {
    console.error('Error getting updated theme files:', error);
    return [];
  }
}

/**
 * Call Google Apps Script webhook handler
 */
async function callAppsScriptWebhook(webhookData, storeName, updatedFiles) {
  try {
    console.log(`Calling Apps Script webhook for store: ${storeName}`);
    
    const payload = {
      action: 'webhook_theme_update',
      storeName: storeName,
      themeData: webhookData,
      updatedFiles: updatedFiles,
      timestamp: new Date().toISOString()
    };

    const response = await axios.post(APPS_SCRIPT_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    console.log('Apps Script response:', response.status, response.data);
    return response.data;

  } catch (error) {
    console.error('Error calling Apps Script:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Get configuration endpoint (for debugging)
 */
app.get('/config', (req, res) => {
  const configInfo = Object.keys(STORE_CONFIG).map(domain => ({
    domain,
    storeName: STORE_CONFIG[domain].storeName,
    hasSecret: !!STORE_CONFIG[domain].webhookSecret
  }));
  
  res.json({
    stores: configInfo,
    appsScriptConfigured: !!APPS_SCRIPT_URL
  });
});

/**
 * Main webhook endpoint for theme updates
 */
app.post('/webhook/theme-update', async (req, res) => {
  try {
    console.log('\n=== THEME UPDATE WEBHOOK RECEIVED ===');
    
    const signature = req.get('X-Shopify-Hmac-Sha256');
    const shopDomain = getStoreDomain(req);
    
    console.log('Shop domain:', shopDomain);
    console.log('Has signature:', !!signature);

    // Find store configuration
    const storeConfig = STORE_CONFIG[shopDomain];
    if (!storeConfig) {
      console.log(`No configuration found for domain: ${shopDomain}`);
      return res.status(400).json({ 
        error: 'Store not configured',
        domain: shopDomain 
      });
    }

    console.log('Store config found:', storeConfig.storeName);

    // Verify webhook signature
    if (!verifyShopifyWebhook(req.body, signature, storeConfig.webhookSecret)) {
      console.log('Webhook verification failed');
      return res.status(401).json({ error: 'Unauthorized - Invalid signature' });
    }

    // Parse webhook data
    const webhookData = JSON.parse(req.body.toString());
    console.log('Webhook data:', {
      themeId: webhookData.id,
      themeName: webhookData.name,
      role: webhookData.role,
      updatedAt: webhookData.updated_at
    });

    // Only process main themes
    if (webhookData.role !== 'main') {
      console.log(`Ignoring non-main theme: ${webhookData.role}`);
      return res.json({ 
        status: 'ignored', 
        reason: 'Not a main theme',
        role: webhookData.role 
      });
    }

    // Get list of updated files (you'll need to implement this based on your needs)
    const updatedFiles = await getUpdatedThemeFiles(
      storeConfig.storeName, 
      webhookData.id, 
      webhookData.updated_at
    );

    if (updatedFiles.length === 0) {
      console.log('No relevant files updated');
      return res.json({ 
        status: 'success', 
        message: 'No relevant files to sync' 
      });
    }

    // Call Apps Script webhook handler
    const appsScriptResponse = await callAppsScriptWebhook(
      webhookData,
      storeConfig.storeName,
      updatedFiles
    );

    console.log('=== WEBHOOK PROCESSING COMPLETE ===\n');

    res.json({
      status: 'success',
      storeName: storeConfig.storeName,
      themeId: webhookData.id,
      updatedFiles: updatedFiles,
      appsScriptResponse: appsScriptResponse
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test endpoint for manual webhook testing
 */
app.post('/test/webhook', async (req, res) => {
  try {
    const { storeName, themeData } = req.body;
    
    if (!storeName || !themeData) {
      return res.status(400).json({
        error: 'Missing required fields: storeName, themeData'
      });
    }

    // Mock updated files for testing
    const updatedFiles = [
      'templates/collection.round-tt-table.json',
      'templates/collection.tt-table.json'
    ];

    const appsScriptResponse = await callAppsScriptWebhook(
      themeData,
      storeName,
      updatedFiles
    );

    res.json({
      status: 'success',
      message: 'Test webhook processed',
      appsScriptResponse: appsScriptResponse
    });

  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({
      error: 'Test webhook failed',
      message: error.message
    });
  }
});

/**
 * Error handling middleware
 */
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
  console.log(`📊 Configured for ${Object.keys(STORE_CONFIG).length} stores`);
  console.log(`🔗 Apps Script URL: ${APPS_SCRIPT_URL ? 'Configured' : 'Not configured'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
}); 