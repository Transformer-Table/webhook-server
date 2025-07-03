const crypto = require('crypto');

// Configure Vercel to disable automatic body parsing for webhook verification
const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to parse JSON from raw body
function parseJsonBody(rawBody) {
  try {
    return JSON.parse(rawBody.toString());
  } catch (error) {
    console.error('Error parsing JSON body:', error);
    return null;
  }
}

// Helper function to get raw body from request
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}

// Branch to store mapping for GitHub webhooks
const BRANCH_CONFIG = {
  'DEV_STAGING_PROMO': {
    storeName: 'DEV_STAGING_PROMO',
    shopifyDomain: 'transformer-table-dev-staging.myshopify.com',
    themeName: 'tt-ca/DEV_STAGING_PROMO'
  }
  // Add more branches as needed:
  // 'main': {
  //   storeName: 'PRODUCTION',
  //   shopifyDomain: 'your-main-store.myshopify.com',
  //   themeName: 'tt-ca/PRODUCTION'
  // }
};

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubWebhook(data, signature, secret) {
  console.log('🔍 === GITHUB WEBHOOK VERIFICATION DEBUG ===');
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
  const calculatedSignature = 'sha256=' + hmac.digest('hex');

  console.log('🔐 GitHub signature (truncated):', signature.substring(0, 15) + '...');
  console.log('🧮 Calculated signature (truncated):', calculatedSignature.substring(0, 15) + '...');

  const result = crypto.timingSafeEqual(
    Buffer.from(calculatedSignature),
    Buffer.from(signature)
  );

  console.log('✅ Verification result:', result ? 'VALID' : 'INVALID');
  console.log('=== END VERIFICATION DEBUG ===');
  return result;
}

/**
 * Extract changed files from GitHub push payload
 */
function getChangedFilesFromPush(payload) {
  const changedFiles = new Set();
  
  // Get files from all commits in the push
  if (payload.commits && Array.isArray(payload.commits)) {
    payload.commits.forEach(commit => {
      // Add all added files
      if (commit.added && Array.isArray(commit.added)) {
        commit.added.forEach(file => changedFiles.add(file));
      }
      
      // Add all modified files
      if (commit.modified && Array.isArray(commit.modified)) {
        commit.modified.forEach(file => changedFiles.add(file));
      }
      
      // Note: We could also track removed files if needed
      // if (commit.removed && Array.isArray(commit.removed)) {
      //   commit.removed.forEach(file => changedFiles.add(file));
      // }
    });
  }
  
  return Array.from(changedFiles);
}

/**
 * Filter for theme-related files only
 */
function filterThemeFiles(files) {
  const themeFilePatterns = [
    /^assets\//,
    /^config\//,
    /^layout\//,
    /^locales\//,
    /^sections\//,
    /^snippets\//,
    /^templates\//
  ];
  
  return files.filter(file => 
    themeFilePatterns.some(pattern => pattern.test(file))
  );
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Hub-Signature-256, X-GitHub-Event');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get raw body for webhook verification
  let rawBody = '';
  let parsedBody = null;
  
  if (req.method === 'POST') {
    try {
      rawBody = await getRawBody(req);
      parsedBody = parseJsonBody(rawBody);
      console.log('📦 Raw body length:', rawBody.length);
      console.log('🔍 Parsed body successfully:', !!parsedBody);
    } catch (error) {
      console.error('Error getting raw body:', error);
      return res.status(400).json({ error: 'Invalid request body' });
    }
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

  // Handle POST requests (GitHub webhooks)
  if (req.method === 'POST') {
    try {
      console.log('\n🚀 === GITHUB PUSH WEBHOOK RECEIVED ===');
      
      const signature = req.headers['x-hub-signature-256'];
      const githubEvent = req.headers['x-github-event'];
      
      console.log('🎯 GitHub event:', githubEvent);
      console.log('🔐 Has signature:', !!signature);
      console.log('📦 Raw body length:', rawBody.length);
      console.log('📋 Content-Type:', req.headers['content-type']);
      console.log('🕒 Request timestamp:', new Date().toISOString());

      // Only process push events
      if (githubEvent !== 'push') {
        console.log(`Ignoring non-push event: ${githubEvent}`);
        return res.status(200).json({ 
          status: 'ignored', 
          reason: 'Not a push event',
          event: githubEvent 
        });
      }

      // Verify webhook signature using raw body
      const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
      const isValidSignature = verifyGitHubWebhook(rawBody, signature, webhookSecret);
      console.log('🔐 Webhook verification result:', isValidSignature ? '✅ VALID' : '❌ INVALID');
      
      if (!isValidSignature) {
        console.log('❌ Webhook verification failed - responding with 401');
        return res.status(401).json({ error: 'Unauthorized - Invalid signature' });
      }

      // Parse webhook data
      console.log('📖 Processing GitHub push data...');
      const pushData = parsedBody;
      
      // Extract branch name
      const branchName = pushData.ref ? pushData.ref.replace('refs/heads/', '') : null;
      console.log('🌿 Branch:', branchName);

      // Find configuration for this branch
      const branchConfig = BRANCH_CONFIG[branchName];
      if (!branchConfig) {
        console.log(`No configuration found for branch: ${branchName}`);
        return res.status(200).json({ 
          status: 'ignored',
          reason: 'Branch not configured for sync',
          branch: branchName 
        });
      }

      console.log('⚙️  Branch config found:', branchConfig.storeName);

      // Get changed files from push
      console.log('📁 === ANALYZING CHANGED FILES ===');
      const allChangedFiles = getChangedFilesFromPush(pushData);
      const themeFiles = filterThemeFiles(allChangedFiles);
      
      console.log('📋 All changed files:', allChangedFiles);
      console.log('🎨 Theme files changed:', themeFiles);
      console.log('📊 Number of theme files:', themeFiles.length);

      if (themeFiles.length === 0) {
        console.log('⚠️  No theme files updated - responding with success');
        return res.status(200).json({ 
          status: 'success', 
          message: 'No theme files to sync',
          debug: {
            storeName: branchConfig.storeName,
            branch: branchName,
            allChangedFiles: allChangedFiles.length,
            themeFiles: themeFiles.length,
            reason: 'No theme files updated'
          }
        });
      }

      // ===========================================
      // DEBUG: LOG COMPLETE WEBHOOK PAYLOAD
      // ===========================================
      console.log('\n🔍 === COMPLETE GITHUB WEBHOOK DEBUG INFO ===');
      console.log('📊 Push data (key info):', {
        repository: pushData.repository?.full_name,
        branch: branchName,
        commits: pushData.commits?.length || 0,
        pusher: pushData.pusher?.name,
        head_commit: {
          id: pushData.head_commit?.id?.substring(0, 7),
          message: pushData.head_commit?.message,
          author: pushData.head_commit?.author?.name,
          timestamp: pushData.head_commit?.timestamp
        }
      });
      console.log('🏪 Store name:', branchConfig.storeName);
      console.log('🏷️  Theme name:', branchConfig.themeName);
      console.log('🌐 Shopify domain:', branchConfig.shopifyDomain);
      console.log('🌿 Branch:', branchName);
      console.log('📁 Changed theme files:', themeFiles);
      console.log('🔐 Has signature:', !!signature);
      console.log('📋 All headers:', JSON.stringify(req.headers, null, 2));
      console.log('=== END DEBUG INFO ===\n');

      console.log('=== GITHUB WEBHOOK PROCESSING COMPLETE (APPS SCRIPT DISABLED) ===\n');

      return res.status(200).json({
        status: 'success',
        message: 'GitHub webhook received and logged (Apps Script temporarily disabled)',
        debug: {
          repository: pushData.repository?.full_name,
          branch: branchName,
          storeName: branchConfig.storeName,
          themeName: branchConfig.themeName,
          shopifyDomain: branchConfig.shopifyDomain,
          commits: pushData.commits?.length || 0,
          changedFiles: allChangedFiles,
          themeFiles: themeFiles,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('GitHub webhook processing error:', error);
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

// Export config for Vercel
module.exports.config = config; 