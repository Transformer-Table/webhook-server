const crypto = require('crypto');

// GraphQL query to fetch theme files content
const themeFileQuery = `
  query GetThemeFileContent($themeId: ID!, $filenames: [String!]!) {
    theme(id: $themeId) {
      id
      name
      role
      files(filenames: $filenames, first: 50) {
        nodes {
          filename
          body {
            ... on OnlineStoreThemeFileBodyText {
              content
            }
          }
        }
      }
    }
  }
`;

// Query to get themes (to find the correct theme ID)
const themesQuery = `
  query getThemes {
    themes(first: 10) {
      nodes {
        id
        name
        role
      }
    }
  }
`;

/**
 * Make a GraphQL request to Shopify
 */
async function makeShopifyGraphQLRequest(shopifyDomain, accessToken, query, variables = {}) {
  const fetch = (await import('node-fetch')).default;
  
  const response = await fetch(`https://${shopifyDomain}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  if (!response.ok) {
    throw new Error(`Shopify API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

/**
 * Find theme by name
 */
async function findThemeByName(shopifyDomain, accessToken, themeName) {
  console.log(`🔍 Finding theme "${themeName}" in store ${shopifyDomain}`);
  
  const data = await makeShopifyGraphQLRequest(shopifyDomain, accessToken, themesQuery);
  
  // Look for theme by name - could be exact match or partial match
  const theme = data.themes.nodes.find(t => 
    t.name === themeName || 
    t.name.includes(themeName) ||
    themeName.includes(t.name)
  );
  
  if (!theme) {
    console.log(`Available themes in ${shopifyDomain}:`, data.themes.nodes.map(t => `${t.name} (${t.role})`));
    throw new Error(`Theme "${themeName}" not found in store ${shopifyDomain}`);
  }
  
  console.log(`✅ Found theme: ${theme.name} (${theme.role}) - ID: ${theme.id}`);
  return theme;
}

/**
 * Fetch file content from Shopify theme
 */
async function fetchThemeFileContent(shopifyDomain, accessToken, themeName, filenames) {
  console.log(`📁 Fetching ${filenames.length} files from theme "${themeName}" in store ${shopifyDomain}`);
  
  // First, find the theme ID
  const theme = await findThemeByName(shopifyDomain, accessToken, themeName);
  
  // Then fetch the file content
  const data = await makeShopifyGraphQLRequest(
    shopifyDomain, 
    accessToken, 
    themeFileQuery, 
    { 
      themeId: theme.id, 
      filenames: filenames 
    }
  );
  
  const files = data.theme.files.nodes;
  console.log(`📦 Retrieved ${files.length} files from Shopify`);
  
  return files.map(file => ({
    filename: file.filename,
    content: file.body?.content || null
  }));
}

/**
 * Extract sections and settings from a theme file's JSON content
 */
function extractSectionsAndSettings(content, filename) {
  try {
    // Clean the content by removing JavaScript comments and extracting the JSON part
    let cleanContent = content;
    
    // Remove JavaScript comments at the beginning
    if (cleanContent.startsWith('/*')) {
      const commentEnd = cleanContent.indexOf('*/');
      if (commentEnd !== -1) {
        cleanContent = cleanContent.substring(commentEnd + 2).trim();
      }
    }
    
    // Remove any trailing comments
    const lastBrace = cleanContent.lastIndexOf('}');
    if (lastBrace !== -1) {
      cleanContent = cleanContent.substring(0, lastBrace + 1);
    }
    
    // Parse the cleaned JSON content
    const jsonContent = JSON.parse(cleanContent);
    
    const sections = jsonContent.sections || {};
    const extractedData = [];
    
    // Extract all sections and their settings/blocks
    Object.keys(sections).forEach(sectionKey => {
      const section = sections[sectionKey];
      
      if (section.settings) {
        // Extract section settings
        Object.keys(section.settings).forEach(settingKey => {
          extractedData.push({
            filename: filename,
            sectionName: sectionKey,
            blockName: '', // Empty for section-level settings
            settingName: settingKey,
            settingValue: section.settings[settingKey]
          });
        });
      }
      
      // Extract block settings
      if (section.blocks) {
        Object.keys(section.blocks).forEach(blockKey => {
          const block = section.blocks[blockKey];
          
          if (block.settings) {
            Object.keys(block.settings).forEach(settingKey => {
              extractedData.push({
                filename: filename,
                sectionName: sectionKey,
                blockName: blockKey,
                settingName: settingKey,
                settingValue: block.settings[settingKey]
              });
            });
          }
        });
      }
    });
    
    console.log(`📊 Extracted ${extractedData.length} settings from ${filename}`);
    return extractedData;
    
  } catch (error) {
    console.error(`❌ Error extracting settings from ${filename}:`, error.message);
    return [];
  }
}

/**
 * Get Shopify access token for a store
 */
function getStoreAccessToken(shopifyDomain) {
  // Map domains to environment variable names
  const domainToEnvVar = {
    'transformer-table-dev-staging.myshopify.com': 'DEV_STAGING_ACCESS_TOKEN',
    'transformer-table-rest-of-world-staging.myshopify.com': 'ROW_STAGING_ACCESS_TOKEN'
  };
  
  const envVarName = domainToEnvVar[shopifyDomain];
  if (!envVarName) {
    throw new Error(`No access token environment variable configured for domain: ${shopifyDomain}`);
  }
  
  const accessToken = process.env[envVarName];
  if (!accessToken) {
    throw new Error(`Access token not found in environment variable: ${envVarName}`);
  }
  
  return accessToken;
}

/**
 * Main function to fetch and extract data from changed theme files
 */
async function processChangedThemeFiles(shopifyDomain, themeName, changedFiles) {
  console.log(`🚀 Processing ${changedFiles.length} changed theme files from ${shopifyDomain}`);
  
  try {
    // Get access token for the store
    const accessToken = getStoreAccessToken(shopifyDomain);
    
    // Fetch file content from Shopify
    const fileContents = await fetchThemeFileContent(shopifyDomain, accessToken, themeName, changedFiles);
    
    // Extract settings from each file
    const allExtractedData = [];
    
    for (const file of fileContents) {
      if (file.content) {
        const extractedSettings = extractSectionsAndSettings(file.content, file.filename);
        allExtractedData.push(...extractedSettings);
      } else {
        console.warn(`⚠️  No content found for file: ${file.filename}`);
      }
    }
    
    console.log(`✅ Successfully processed ${allExtractedData.length} total settings from ${changedFiles.length} files`);
    return allExtractedData;
    
  } catch (error) {
    console.error(`❌ Error processing theme files:`, error.message);
    throw error;
  }
}

module.exports = {
  processChangedThemeFiles,
  extractSectionsAndSettings,
  fetchThemeFileContent,
  findThemeByName,
  makeShopifyGraphQLRequest
}; 