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
    themes(first: 50) {
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
 * Find theme by name, prioritizing MAIN (published) themes
 */
async function findThemeByName(shopifyDomain, accessToken, themeName) {
  console.log(`🔍 Finding theme "${themeName}" in store ${shopifyDomain}`);
  
  const data = await makeShopifyGraphQLRequest(shopifyDomain, accessToken, themesQuery);
  
  // Log all available themes for debugging
  console.log(`📋 Available themes in ${shopifyDomain}:`);
  data.themes.nodes.forEach(t => {
    console.log(`   - ${t.name} (${t.role}) - ${t.id}`);
  });
  
  // 🎯 STEP 1: Try exact match first (highest priority)
  let selectedTheme = data.themes.nodes.find(t => t.name === themeName);
  
  if (selectedTheme) {
    console.log(`✅ Found EXACT match theme: ${selectedTheme.name} (${selectedTheme.role}) - ID: ${selectedTheme.id}`);
    return selectedTheme;
  }
  
  // 🎯 STEP 2: If no exact match, try partial matching
  const matchingThemes = data.themes.nodes.filter(t => 
    t.name.includes(themeName) ||
    themeName.includes(t.name)
  );
  
  if (matchingThemes.length === 0) {
    throw new Error(`Theme "${themeName}" not found in store ${shopifyDomain}`);
  }
  
  // 🎯 STEP 3: For partial matches, prioritize by role (but prefer non-MAIN for safety)
  const roleOrder = ['UNPUBLISHED', 'PUBLISHED', 'DEVELOPMENT', 'MAIN'];
  
  for (const role of roleOrder) {
    selectedTheme = matchingThemes.find(t => t.role === role);
    if (selectedTheme) {
      console.log(`✅ Found ${role} theme (partial match): ${selectedTheme.name} (${selectedTheme.role}) - ID: ${selectedTheme.id}`);
      break;
    }
  }
  
  // If no theme found with preferred roles, use the first match
  if (!selectedTheme) {
    selectedTheme = matchingThemes[0];
    console.log(`⚠️  Using fallback theme: ${selectedTheme.name} (${selectedTheme.role}) - ID: ${selectedTheme.id}`);
  }
  
  return selectedTheme;
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
    const extractedData = [];
    
    // Handle config/settings_data.json differently
    if (filename === 'config/settings_data.json') {
      console.log('📋 Processing settings_data.json file');
      
      // Process all root-level keys
      Object.keys(jsonContent).forEach(rootKey => {
        const rootValue = jsonContent[rootKey];
        
        if (rootKey === 'current' && typeof rootValue === 'object' && rootValue !== null) {
          // Extract from 'current' object (theme settings)
          Object.keys(rootValue).forEach(settingKey => {
            if (settingKey === 'sections' && typeof rootValue[settingKey] === 'object') {
              // Handle nested sections within current
              Object.keys(rootValue[settingKey]).forEach(sectionKey => {
                const section = rootValue[settingKey][sectionKey];
                
                if (section.settings) {
                  Object.keys(section.settings).forEach(nestedSettingKey => {
                    extractedData.push({
                      filename: filename,
                      sectionName: `current.sections.${sectionKey}`, // ✅ Create the format your sheet expects
                      blockName: '',
                      settingName: nestedSettingKey,
                      settingValue: section.settings[nestedSettingKey]
                    });
                  });
                }
                
                if (section.blocks) {
                  Object.keys(section.blocks).forEach(blockKey => {
                    const block = section.blocks[blockKey];
                    if (block.settings) {
                      Object.keys(block.settings).forEach(nestedSettingKey => {
                        extractedData.push({
                          filename: filename,
                          sectionName: `current.sections.${sectionKey}`,
                          blockName: blockKey,
                          settingName: nestedSettingKey,
                          settingValue: block.settings[nestedSettingKey]
                        });
                      });
                    }
                  });
                }
              });
            } else if (typeof rootValue[settingKey] !== 'object') {
              // Handle regular current settings
              extractedData.push({
                filename: filename,
                sectionName: 'current',
                blockName: '',
                settingName: settingKey,
                settingValue: rootValue[settingKey]
              });
            }
          });
        } else if (rootKey === 'sections' && typeof rootValue === 'object' && rootValue !== null) {
          // Extract from sections if they exist in settings_data.json
          Object.keys(rootValue).forEach(sectionKey => {
            const section = rootValue[sectionKey];
            
            if (section.settings) {
              Object.keys(section.settings).forEach(settingKey => {
                extractedData.push({
                  filename: filename,
                  sectionName: sectionKey,
                  blockName: '',
                  settingName: settingKey,
                  settingValue: section.settings[settingKey]
                });
              });
            }
            
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
        } else if (rootKey.startsWith('current.') && typeof rootValue === 'object' && rootValue !== null) {
          // ✅ HANDLE SPECIAL CASE: current.sections.header, current.sections.footer, etc.
          console.log(`📋 Processing special nested section: ${rootKey}`);
          Object.keys(rootValue).forEach(settingKey => {
            extractedData.push({
              filename: filename,
              sectionName: rootKey, // Use the full key like "current.sections.header"
              blockName: '',
              settingName: settingKey,
              settingValue: rootValue[settingKey]
            });
          });
        } else if (typeof rootValue !== 'object') {
          // Handle any other root-level simple settings
          extractedData.push({
            filename: filename,
            sectionName: 'root',
            blockName: '',
            settingName: rootKey,
            settingValue: rootValue
          });
        }
      });
    } else if (filename.startsWith('locales/') && filename.endsWith('.json')) {
      console.log('📋 Processing locale file');
      
      // Handle locale files with nested structure
      function extractLocaleSettings(obj, currentPath = '') {
        Object.keys(obj).forEach(key => {
          const fullPath = currentPath ? `${currentPath}.${key}` : key;
          const value = obj[key];
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Recursively process nested objects
            extractLocaleSettings(value, fullPath);
          } else {
            // This is a leaf value, extract it
            extractedData.push({
              filename: filename,
              sectionName: currentPath || key, // Use the parent path as section
              blockName: '', // Empty for locale files
              settingName: currentPath ? key : fullPath, // Use key as setting name
              settingValue: value
            });
          }
        });
      }
      
      extractLocaleSettings(jsonContent);
      
    } else {
      // Handle regular template files
      console.log('📋 Processing regular template file');
      const sections = jsonContent.sections || {};
      
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
    }
    
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
  // Build completely dynamic mapping from environment variables
  // Pattern: {PREFIX}_DOMAIN and {PREFIX}_ACCESS_TOKEN
  const domainToEnvVar = {};
  
  Object.keys(process.env).forEach(key => {
    if (key.endsWith('_DOMAIN')) {
      const prefix = key.replace('_DOMAIN', '');
      const tokenKey = `${prefix}_ACCESS_TOKEN`;
      if (process.env[tokenKey] && process.env[key]) {
        domainToEnvVar[process.env[key]] = tokenKey;
      }
    }
  });
  
  console.log(`🔍 Available store domains: ${Object.keys(domainToEnvVar).join(', ')}`);
  
  const envVarName = domainToEnvVar[shopifyDomain];
  if (!envVarName) {
    const availableDomains = Object.keys(domainToEnvVar);
    throw new Error(`No access token environment variable configured for domain: ${shopifyDomain}. Available domains: ${availableDomains.join(', ')}`);
  }
  
  const accessToken = process.env[envVarName];
  if (!accessToken) {
    throw new Error(`Access token not found in environment variable: ${envVarName}`);
  }
  
  console.log(`✅ Found access token for domain: ${shopifyDomain}`);
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