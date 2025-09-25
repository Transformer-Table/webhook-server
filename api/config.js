// Branch to store mapping for GitHub webhooks
const BRANCH_CONFIG = {
  'DEV_STAGING_PROMO': {
    storeName: 'DEV_STAGING_PROMO',
    shopifyDomain: process.env.DEV_STAGING_DOMAIN,
    themeName: 'tt-ca/DEV_STAGING_PROMO USE ME'
  },
  'GCC': {
    storeName: 'GCC',
    shopifyDomain: process.env.GCC_DOMAIN,
    themeName: 'tt-ca/GCC_Staging'
  },
  'ROW_Staging': {
    storeName: 'ROW',
    shopifyDomain: process.env.ROW_DOMAIN,
    themeName: 'tt-ca/ROW_Staging'
  },
  // 🌍 REGIONAL STAGING BRANCHES
  'AUS_Staging': {
    storeName: 'AUS',
    shopifyDomain: process.env.AUS_DOMAIN,
    themeName: process.env.AUS_THEME_NAME || 'tt-ca/AUS_Staging'
  },
  'GER_Staging': {
    storeName: 'GER',
    shopifyDomain: process.env.GER_DOMAIN,
    themeName: process.env.GER_THEME_NAME || 'tt-ca/GER_Staging'
  },
  'UK_Staging': {
    storeName: 'UK',
    shopifyDomain: process.env.UK_DOMAIN,
    themeName: process.env.UK_THEME_NAME || 'tt-ca/UK_Staging'
  },
  'EU_Staging': {
    storeName: 'EU',
    shopifyDomain: process.env.EU_DOMAIN,
    themeName: process.env.EU_THEME_NAME || 'tt-ca/EU_Staging'
  },
  'SINGA_Staging': {
    storeName: 'SING',
    shopifyDomain: process.env.SING_DOMAIN,
    themeName: process.env.SING_THEME_NAME || 'tt-ca/SINGA_Staging'
  },
  'FR_Staging': {
    storeName: 'FR',
    shopifyDomain: process.env.FR_DOMAIN,
    themeName: process.env.FR_THEME_NAME || 'tt-ca/FR_Staging'
  },
  // 🇨🇦 CANADA STAGING (for 'staging' branch)
  'CA_Staging': {
    storeName: 'CA',
    shopifyDomain: process.env.CA_DOMAIN || process.env.DEV_STAGING_DOMAIN,
    themeName: process.env.CANADA_THEME_NAME || 'tt-ca/CA_Staging CA STAGING'
  },
  // 🇺🇸 USA STAGING (for 'staging' branch in tt-usa repo)
  'staging': {
    storeName: 'US',
    shopifyDomain: process.env.US_DOMAIN || 'transformer-table-us.myshopify.com',
    themeName: process.env.US_THEME_NAME || 'TT USA Staging [NEW] [USE ME]'
  }
  // Add more branches as needed:
  // 'main': {
  //   storeName: 'PRODUCTION',
  //   shopifyDomain: process.env.PRODUCTION_DOMAIN || 'your-main-store.myshopify.com',
  //   themeName: process.env.PRODUCTION_THEME_NAME || 'tt-ca/PRODUCTION'
  // }
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
    const configInfo = Object.keys(BRANCH_CONFIG).map(branch => ({
      branch,
      storeName: BRANCH_CONFIG[branch].storeName,
      shopifyDomain: BRANCH_CONFIG[branch].shopifyDomain,
      themeName: BRANCH_CONFIG[branch].themeName
    }));
    
    return res.status(200).json({
      branches: configInfo,
      webhookType: 'GitHub',
      hasGitHubSecret: !!process.env.GITHUB_WEBHOOK_SECRET,
      appsScriptConfigured: !!process.env.APPS_SCRIPT_URL,
      timestamp: new Date().toISOString()
    });
  }

  return res.status(405).json({
    error: 'Method not allowed',
    method: req.method
  });
}; 