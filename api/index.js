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

const { processChangedThemeFiles } = require('./shopify-client');

// Branch to store mapping for GitHub webhooks
const BRANCH_CONFIG = {
  'DEV_STAGING_PROMO': {
    storeName: 'DEV_STAGING_PROMO',
    shopifyDomain: process.env.DEV_STAGING_DOMAIN,
    themeName: 'tt-ca/DEV_STAGING_PROMO USE ME'
  },
  'GCC Staging': {
    storeName: 'GCC',
    shopifyDomain: process.env.GCC_DOMAIN,
    themeName: 'tt-ca/GCC_Staging'
  },
  'ROW_Staging': {
    storeName: 'ROW',
    shopifyDomain: process.env.ROW_DOMAIN,
    themeName: 'tt-ca/ROW_Staging'
  }
  // Add more branches as needed:
  // 'main': {
  //   storeName: 'PRODUCTION',
  //   shopifyDomain: process.env.PRODUCTION_DOMAIN,
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

/**
 * Send extracted theme data to Google Apps Script
 */
async function sendToAppsScript(extractedData, branchConfig, branchName, updatedFiles) {
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  
  if (!appsScriptUrl) {
    throw new Error('APPS_SCRIPT_URL environment variable not configured');
  }

  console.log(`📧 Sending ${extractedData.length} extracted settings to Apps Script...`);

  // 🔧 If too many settings, chunk them to prevent rate limiting
  const CHUNK_SIZE = 100; // Process 100 settings at a time
  
  if (extractedData.length > CHUNK_SIZE) {
    console.log(`📦 Large payload detected (${extractedData.length} settings). Chunking into smaller requests...`);
    
    const chunks = [];
    for (let i = 0; i < extractedData.length; i += CHUNK_SIZE) {
      chunks.push(extractedData.slice(i, i + CHUNK_SIZE));
    }
    
    console.log(`📦 Split into ${chunks.length} chunks of max ${CHUNK_SIZE} settings each`);
    
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    // Process chunks sequentially with delays
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`📦 Processing chunk ${i + 1}/${chunks.length} (${chunk.length} settings)...`);
      
      try {
        const chunkResult = await sendChunkToAppsScript(appsScriptUrl, chunk, branchConfig, branchName, updatedFiles, i + 1);
        const parsed = JSON.parse(chunkResult);
        
        totalUpdated += parsed.updated || 0;
        totalSkipped += parsed.skipped || 0;
        totalErrors += parsed.errors || 0;
        
        // Add delay between chunks to prevent rate limiting
        if (i < chunks.length - 1) {
          console.log(`⏳ Waiting 2 seconds before next chunk...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.log(`❌ Chunk ${i + 1} failed: ${error.message}`);
        totalErrors += chunk.length; // Count all as errors
      }
    }
    
    const finalResult = {
      status: 'success',
      message: `Processed ${extractedData.length} settings in ${chunks.length} chunks`,
      updated: totalUpdated,
      skipped: totalSkipped,
      errors: totalErrors,
      chunked: true,
      chunks: chunks.length
    };
    
    console.log(`✅ Chunked processing complete:`, JSON.stringify(finalResult));
    return JSON.stringify(finalResult);
  }
  
  // Single request for smaller payloads
  return await sendChunkToAppsScript(appsScriptUrl, extractedData, branchConfig, branchName, updatedFiles, 1);
}

async function sendChunkToAppsScript(appsScriptUrl, extractedData, branchConfig, branchName, updatedFiles, chunkNumber) {
  const fetch = (await import('node-fetch')).default;
  
  const payload = {
    action: 'webhook_theme_update',
    storeName: branchConfig.storeName,
    themeData: {
      shopifyDomain: branchConfig.shopifyDomain,
      themeName: branchConfig.themeName,
      branch: branchName,
      extractedSettings: extractedData,
      timestamp: new Date().toISOString(),
      chunkNumber: chunkNumber
    },
    updatedFiles: updatedFiles
  };

  // Retry logic for rate limiting
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.text();
        console.log(`✅ Apps Script response (chunk ${chunkNumber}):`, result);
        return result;
      }
      
      // Handle rate limiting
      if (response.status === 429 || response.status === 503) {
        attempts++;
        const waitTime = Math.pow(2, attempts) * 1000; // Exponential backoff
        console.log(`⏳ Rate limited (${response.status}). Waiting ${waitTime}ms before retry ${attempts}/${maxAttempts}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      throw new Error(`Apps Script request failed: ${response.status} ${response.statusText}`);
      
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw error;
      }
      
      console.log(`⏳ Request failed. Retrying in 2 seconds... (${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
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

      // ===========================================
      // SHOPIFY API INTEGRATION & APPS SCRIPT
      // ===========================================
      console.log('🔄 === PROCESSING THEME FILES WITH SHOPIFY API ===');
      
      // 🕒 Add configurable delay to allow GitHub → Shopify theme sync to complete
      const SHOPIFY_SYNC_DELAY = 5000; // Default 30 seconds for GitHub sync
      console.log(`⏳ Waiting ${SHOPIFY_SYNC_DELAY}ms for Shopify theme sync to complete...`);
      await new Promise(resolve => setTimeout(resolve, SHOPIFY_SYNC_DELAY));
      console.log('✅ Delay complete, proceeding with Shopify API calls');
      
      try {
        // Fetch and extract data from Shopify theme files
        const extractedData = await processChangedThemeFiles(
          branchConfig.shopifyDomain,
          branchConfig.themeName,
          themeFiles
        );

        if (extractedData.length === 0) {
          console.log('⚠️  No settings extracted from theme files');
          return res.status(200).json({
            status: 'success',
            message: 'No settings found to sync',
            debug: {
              repository: pushData.repository?.full_name,
              branch: branchName,
              storeName: branchConfig.storeName,
              themeName: branchConfig.themeName,
              shopifyDomain: branchConfig.shopifyDomain,
              commits: pushData.commits?.length || 0,
              changedFiles: allChangedFiles,
              themeFiles: themeFiles,
              extractedSettings: extractedData.length,
              timestamp: new Date().toISOString()
            }
          });
        }

        // Send extracted data to Apps Script
        console.log('📧 === SENDING TO APPS SCRIPT ===');
        const appsScriptResponse = await sendToAppsScript(extractedData, branchConfig, branchName, themeFiles);

        console.log('✅ === GITHUB WEBHOOK PROCESSING COMPLETE ===\n');

        return res.status(200).json({
          status: 'success',
          message: 'Theme files processed and Google Sheets updated successfully',
          debug: {
            repository: pushData.repository?.full_name,
            branch: branchName,
            storeName: branchConfig.storeName,
            themeName: branchConfig.themeName,
            shopifyDomain: branchConfig.shopifyDomain,
            commits: pushData.commits?.length || 0,
            changedFiles: allChangedFiles,
            themeFiles: themeFiles,
            extractedSettings: extractedData.length,
            appsScriptResponse: appsScriptResponse,
            timestamp: new Date().toISOString()
          }
        });

      } catch (shopifyError) {
        console.error('❌ Error processing Shopify files:', shopifyError.message);
        
        return res.status(500).json({
          status: 'error',
          message: 'Failed to process theme files from Shopify',
          error: shopifyError.message,
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
      }

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