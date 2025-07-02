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
  
  // DEV Staging Store
  'transformer-table-dev-staging.myshopify.com': {
    storeName: 'DEV_STAGING_PROMO',
    webhookSecret: process.env.DEV_STAGING_WEBHOOK_SECRET
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

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const configInfo = Object.keys(STORE_CONFIG).map(domain => ({
      domain,
      storeName: STORE_CONFIG[domain].storeName,
      hasSecret: !!STORE_CONFIG[domain].webhookSecret
    }));
    
    return res.status(200).json({
      stores: configInfo,
      appsScriptConfigured: !!process.env.APPS_SCRIPT_URL,
      timestamp: new Date().toISOString()
    });
  }

  return res.status(405).json({
    error: 'Method not allowed',
    method: req.method
  });
}; 