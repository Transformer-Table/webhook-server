// Branch to store mapping for GitHub webhooks
const BRANCH_CONFIG = {
  'DEV_STAGING_PROMO': {
    storeName: 'DEV_STAGING_PROMO',
    shopifyDomain: 'transformer-table-dev-staging.myshopify.com',
    themeName: 'tt-ca/DEV_STAGING_PROMO'
  },
  'ROW_Staging': {
    storeName: 'ROW_Staging', 
    shopifyDomain: 'transformer-table-rest-of-world-staging.myshopify.com',
    themeName: 'tt-ca/ROW_Staging'
  }
  // Add more branches as needed:
  // 'main': {
  //   storeName: 'PRODUCTION',
  //   shopifyDomain: 'your-main-store.myshopify.com',
  //   themeName: 'tt-ca/PRODUCTION'
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