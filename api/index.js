const crypto = require('crypto');

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

/**
 * Verify Shopify webhook signature
 */
function verifyShopifyWebhook(data, signature, secret) {
  console.log('🔍 === WEBHOOK VERIFICATION DEBUG ===');
  console.log('🔐 Has signature:', !!signature);
  console.log('🔑 Has secret:', !!secret);
  console.log('📦 Data length:', data ? data.length : 'No data');
  
  if (!signature || !secret) {
    console.log('❌ Missing signature or secret');
    console.log('=== END VERIFICATION DEBUG ===');
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data, 'utf8');
  const calculatedSignature = hmac.digest('base64');

  // Remove 'sha256=' prefix from Shopify signature
  const shopifySignature = signature.replace('sha256=', '');

  console.log('🔐 Shopify signature (truncated):', shopifySignature.substring(0, 10) + '...');
  console.log('🧮 Calculated signature (truncated):', calculatedSignature.substring(0, 10) + '...');

  const result = crypto.timingSafeEqual(
    Buffer.from(calculatedSignature),
    Buffer.from(shopifySignature)
  );

  console.log('✅ Verification result:', result ? 'VALID' : 'INVALID');
  console.log('=== END VERIFICATION DEBUG ===');
  return result;
}

/**
 * Extract store domain from Shopify headers
 */
function getStoreDomain(req) {
  // Try to get domain from Shopify headers
  const shopDomain = req.headers['x-shopify-shop-domain'] || 
                    req.headers['x-shopify-shop'] ||
                    req.body?.domain;
  
  console.log('Extracted shop domain:', shopDomain);
  return shopDomain;
}

/**
 * Get updated files from Shopify theme (mocked for debugging)
 */
async function getUpdatedThemeFiles(storeName, themeId, lastUpdated) {
  try {
    console.log(`Getting updated files for theme ${themeId} in store ${storeName}`);
    
    // This would require Shopify API access - for now, returning a mock response
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

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Shopify-Hmac-Sha256, X-Shopify-Shop-Domain');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Route different endpoints
  if (req.method === 'GET') {
    // Health check endpoint - works for any GET request to this function
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: 'Webhook handler is running',
      url: req.url,
      path: req.url
    });
  }

  // Handle POST requests (webhooks)
  if (req.method === 'POST') {
    try {
      console.log('\n🚀 === THEME UPDATE WEBHOOK RECEIVED ===');
      
      const signature = req.headers['x-shopify-hmac-sha256'];
      const shopDomain = getStoreDomain(req);
      
      console.log('🌐 Shop domain:', shopDomain);
      console.log('🔐 Has signature:', !!signature);
      console.log('📦 Raw body length:', req.body ? JSON.stringify(req.body).length : 'No body');
      console.log('📋 Content-Type:', req.headers['content-type']);
      console.log('🕒 Request timestamp:', new Date().toISOString());

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

      // Convert body to string for verification
      const bodyString = JSON.stringify(req.body);

      // Verify webhook signature
      const isValidSignature = verifyShopifyWebhook(bodyString, signature, storeConfig.webhookSecret);
      console.log('🔐 Webhook verification result:', isValidSignature ? '✅ VALID' : '❌ INVALID');
      
      if (!isValidSignature) {
        console.log('❌ Webhook verification failed - responding with 401');
        return res.status(401).json({ error: 'Unauthorized - Invalid signature' });
      }

      // Parse webhook data
      console.log('📖 Processing webhook data...');
      const webhookData = req.body;
      console.log('✅ Successfully processed webhook data');
      console.log('📋 Basic webhook info:', {
        themeId: webhookData.id,
        themeName: webhookData.name,
        role: webhookData.role,
        updatedAt: webhookData.updated_at
      });

      // Only process main themes
      if (webhookData.role !== 'main') {
        console.log(`Ignoring non-main theme: ${webhookData.role}`);
        return res.status(200).json({ 
          status: 'ignored', 
          reason: 'Not a main theme',
          role: webhookData.role 
        });
      }

      // Get list of updated files (currently mocked for debugging)
      console.log('📁 === GETTING UPDATED FILES ===');
      const updatedFiles = await getUpdatedThemeFiles(
        storeConfig.storeName, 
        webhookData.id, 
        webhookData.updated_at
      );
      console.log('📋 Updated files result:', updatedFiles);
      console.log('📊 Number of files:', updatedFiles.length);

      if (updatedFiles.length === 0) {
        console.log('⚠️  No relevant files updated - responding with success');
        return res.status(200).json({ 
          status: 'success', 
          message: 'No relevant files to sync',
          debug: {
            storeName: storeConfig.storeName,
            themeId: webhookData.id,
            reason: 'No files updated'
          }
        });
      }

      // ===========================================
      // DEBUG: LOG COMPLETE WEBHOOK PAYLOAD
      // ===========================================
      console.log('\n🔍 === COMPLETE WEBHOOK DEBUG INFO ===');
      console.log('📊 Raw webhook data:', JSON.stringify(webhookData, null, 2));
      console.log('🏪 Store name:', storeConfig.storeName);
      console.log('🎨 Theme ID:', webhookData.id);
      console.log('🏷️  Theme name:', webhookData.name);
      console.log('👑 Theme role:', webhookData.role);
      console.log('⏰ Updated at:', webhookData.updated_at);
      console.log('📁 Updated files (mocked):', updatedFiles);
      console.log('🌐 Shop domain:', getStoreDomain(req));
      console.log('🔐 Has signature:', !!req.headers['x-shopify-hmac-sha256']);
      console.log('📋 All headers:', JSON.stringify(req.headers, null, 2));
      console.log('=== END DEBUG INFO ===\n');

      console.log('=== WEBHOOK PROCESSING COMPLETE (APPS SCRIPT DISABLED) ===\n');

      return res.status(200).json({
        status: 'success',
        message: 'Webhook received and logged (Apps Script temporarily disabled)',
        debug: {
          storeName: storeConfig.storeName,
          themeId: webhookData.id,
          themeName: webhookData.name,
          themeRole: webhookData.role,
          updatedAt: webhookData.updated_at,
          updatedFiles: updatedFiles,
          shopDomain: getStoreDomain(req),
          hasSignature: !!req.headers['x-shopify-hmac-sha256'],
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Webhook processing error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    error: 'Method not allowed',
    method: req.method
  });
}; 