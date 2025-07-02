// Enhanced Google Apps Script with Webhook Support
// This script includes your original functionality PLUS webhook handling

// ===== CONFIGURATION =====
const CONFIG = {
  stores: {
    'US_Live': {
      domain: 'your-us-store.myshopify.com',
      token: 'shpat_your_us_token_here',
      themeName: 'tt-ca/US_Live'
    },
    'UK_Live': {
      domain: 'your-uk-store.myshopify.com', 
      token: 'shpat_your_uk_token_here',
      themeName: 'tt-ca/UK_Live'
    },
    'EU_Live': {
      domain: 'your-eu-store.myshopify.com',
      token: 'shpat_your_eu_token_here', 
      themeName: 'tt-ca/EU_Live'
    },
    'GER_Live': {
      domain: 'your-ger-store.myshopify.com',
      token: 'shpat_your_ger_token_here',
      themeName: 'tt-ca/GER_Live'
    },
    'GCC_Live': {
      domain: 'your-gcc-store.myshopify.com',
      token: 'shpat_your_gcc_token_here',
      themeName: 'tt-ca/GCC_Live'
    },
    'AUS_Live': {
      domain: 'your-aus-store.myshopify.com',
      token: 'shpat_your_aus_token_here',
      themeName: 'tt-ca/AUS_Live'
    },
    'SING_Live': {
      domain: 'your-sing-store.myshopify.com',
      token: 'shpat_your_sing_token_here',
      themeName: 'tt-ca/SING_Live'
    },
    'FR_Live': {
      domain: 'your-fr-store.myshopify.com',
      token: 'shpat_your_fr_token_here',
      themeName: 'tt-ca/FR_Live'
    },
    'ROW_Live': {
      domain: 'your-row-store.myshopify.com',
      token: 'shpat_your_row_token_here',
      themeName: 'tt-ca/ROW_Live'
    },
    // Add staging stores
    'US_Staging': {
      domain: 'your-us-staging.myshopify.com',
      token: 'shpat_your_us_staging_token_here',
      themeName: 'tt-ca/US_Staging'
    },
    'UK_Staging': {
      domain: 'your-uk-staging.myshopify.com',
      token: 'shpat_your_uk_staging_token_here',
      themeName: 'tt-ca/UK_Staging'
    },
    'EU_Staging': {
      domain: 'your-eu-staging.myshopify.com',
      token: 'shpat_your_eu_staging_token_here',
      themeName: 'tt-ca/EU_Staging'
    },
    'GER_Staging': {
      domain: 'your-ger-staging.myshopify.com',
      token: 'shpat_your_ger_staging_token_here',
      themeName: 'tt-ca/GER_Staging'
    },
    'GCC_Staging': {
      domain: 'your-gcc-staging.myshopify.com',
      token: 'shpat_your_gcc_staging_token_here',
      themeName: 'tt-ca/GCC_Staging'
    },
    'AUS_Staging': {
      domain: 'your-aus-staging.myshopify.com',
      token: 'shpat_your_aus_staging_token_here',
      themeName: 'tt-ca/AUS_Staging'
    },
    'SINGA_Staging': {
      domain: 'your-singa-staging.myshopify.com',
      token: 'shpat_your_singa_staging_token_here',
      themeName: 'tt-ca/SINGA_Staging'
    },
    'FR_Staging': {
      domain: 'your-fr-staging.myshopify.com',
      token: 'shpat_your_fr_staging_token_here',
      themeName: 'tt-ca/FR_Staging'
    },
    'ROW_Staging': {
      domain: 'your-row-staging.myshopify.com',
      token: 'shpat_your_row_staging_token_here',
      themeName: 'tt-ca/ROW_Staging'
    }
  }
};

// ===== ORIGINAL MENU AND TOGGLE FUNCTIONS =====

/**
 * Creates a menu item when the spreadsheet is opened
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Shopify Tools')
    .addItem('Turn Off Theme Updates', 'turnOffThemeUpdates')
    .addItem('Turn On Theme Updates', 'turnOnThemeUpdates')
    .addItem('Turn Off Webhook Sync', 'turnOffWebhookSync')
    .addItem('Turn On Webhook Sync', 'turnOnWebhookSync')
    .addItem('Manual Sync from Shopify', 'manualSyncFromShopify')
    .addToUi();
  Logger.log('Menu created');
}

/**
 * Turns off automatic theme updates
 */
function turnOffThemeUpdates() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('THEME_UPDATES_ENABLED', 'false');
  Logger.log('Automatic theme updates have been turned OFF');
}

/**
 * Turns on automatic theme updates
 */
function turnOnThemeUpdates() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('THEME_UPDATES_ENABLED', 'true');
  Logger.log('Automatic theme updates have been turned ON');
}

/**
 * Turns off webhook sync from Shopify to Sheets
 */
function turnOffWebhookSync() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('WEBHOOK_SYNC_ENABLED', 'false');
  Logger.log('Webhook sync from Shopify has been turned OFF');
}

/**
 * Turns on webhook sync from Shopify to Sheets
 */
function turnOnWebhookSync() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('WEBHOOK_SYNC_ENABLED', 'true');
  Logger.log('Webhook sync from Shopify has been turned ON');
}

// ===== WEB APP HANDLER (for webhook calls) =====

/**
 * Handles POST requests from the webhook server
 */
function doPost(e) {
  try {
    Logger.log('=== WEBHOOK REQUEST RECEIVED ===');
    
    if (!e.postData || !e.postData.contents) {
      Logger.log('No POST data received');
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'No data received' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const requestData = JSON.parse(e.postData.contents);
    Logger.log('Request data:', requestData);

    // Route based on action
    switch (requestData.action) {
      case 'webhook_theme_update':
        return handleThemeUpdateWebhook(requestData);
      
      case 'manual_sync':
        return handleManualSync(requestData);
        
      default:
        Logger.log('Unknown action:', requestData.action);
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'Unknown action' }))
          .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    Logger.log('doPost error:', error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles GET requests (for testing)
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ 
      status: 'healthy',
      message: 'Shopify theme sync webhook handler is running',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== WEBHOOK HANDLERS =====

/**
 * Handle theme update webhook from Node.js server
 */
function handleThemeUpdateWebhook(requestData) {
  try {
    Logger.log('=== PROCESSING THEME UPDATE WEBHOOK ===');
    
    const scriptProperties = PropertiesService.getScriptProperties();
    
    // Check if webhook sync is enabled
    if (scriptProperties.getProperty('WEBHOOK_SYNC_ENABLED') === 'false') {
      Logger.log('Webhook sync is currently disabled');
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'disabled',
          message: 'Webhook sync is currently disabled'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const { storeName, themeData, updatedFiles } = requestData;
    
    if (!storeName || !themeData || !updatedFiles) {
      throw new Error('Missing required webhook data');
    }

    Logger.log(`Processing webhook for store: ${storeName}`);
    Logger.log(`Theme: ${themeData.name} (ID: ${themeData.id})`);
    Logger.log(`Updated files: ${updatedFiles.length}`);

    // Set a flag to prevent atEdit from firing during webhook sync
    scriptProperties.setProperty('WEBHOOK_SYNC_IN_PROGRESS', 'true');

    try {
      // Process the webhook
      const result = syncShopifyChangesToSheet(storeName, themeData, updatedFiles);
      
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'success',
          message: 'Webhook processed successfully',
          result: result
        }))
        .setMimeType(ContentService.MimeType.JSON);

    } finally {
      // Always clear the sync flag
      scriptProperties.deleteProperty('WEBHOOK_SYNC_IN_PROGRESS');
    }

  } catch (error) {
    Logger.log('Webhook processing error:', error.toString());
    
    // Clear sync flag on error
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.deleteProperty('WEBHOOK_SYNC_IN_PROGRESS');
    
    return ContentService
      .createTextOutput(JSON.stringify({
        error: 'Webhook processing failed',
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Sync Shopify theme changes to Google Sheets
 */
function syncShopifyChangesToSheet(storeName, themeData, updatedFiles) {
  try {
    Logger.log(`Starting sync for ${storeName}`);
    
    const store = CONFIG.stores[storeName];
    if (!store) {
      throw new Error(`Store configuration not found for: ${storeName}`);
    }

    // Get the sheet for this store
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(storeName);
    
    if (!sheet) {
      Logger.log(`Sheet not found for store: ${storeName}`);
      return { skipped: true, reason: 'Sheet not found' };
    }

    // Get headers and data
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const fileNameColIndex = headers.indexOf('File Name');
    const settingValueColIndex = headers.indexOf('Setting Value');
    
    if (fileNameColIndex === -1 || settingValueColIndex === -1) {
      throw new Error('Required columns not found in sheet');
    }

    // Get all data from the sheet
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length);
    const allData = dataRange.getValues();
    
    let updatedCount = 0;
    
    // Process each updated file
    for (const fileName of updatedFiles) {
      Logger.log(`Processing file: ${fileName}`);
      
      // Find rows that match this file
      const matchingRows = [];
      for (let i = 0; i < allData.length; i++) {
        if (allData[i][fileNameColIndex] === fileName) {
          matchingRows.push(i + 2); // +2 for 1-based indexing and header row
        }
      }
      
      if (matchingRows.length === 0) {
        Logger.log(`No rows found for file: ${fileName}`);
        continue;
      }
      
      Logger.log(`Found ${matchingRows.length} rows for file: ${fileName}`);
      
      // Get current file content from Shopify
      try {
        const themeId = getThemeId(store, store.themeName);
        const fileContent = getCurrentFileContent(store, themeId, fileName);
        
        // Update each matching row
        for (const rowIndex of matchingRows) {
          const rowData = allData[rowIndex - 2]; // Convert back to 0-based for array access
          
          const sectionName = rowData[headers.indexOf('Section Name')];
          const blockName = rowData[headers.indexOf('Block Name')];
          const settingName = rowData[headers.indexOf('Setting Name')];
          
          if (!sectionName || !settingName) {
            Logger.log(`Skipping row ${rowIndex} - missing section or setting name`);
            continue;
          }
          
          // Extract current value from Shopify
          let currentValue = '';
          try {
            if (blockName) {
              // Block setting
              currentValue = fileContent.sections[sectionName]?.blocks[blockName]?.settings[settingName] || '';
            } else {
              // Section setting
              currentValue = fileContent.sections[sectionName]?.settings[settingName] || '';
            }
          } catch (error) {
            Logger.log(`Error extracting value for ${sectionName}.${blockName || 'section'}.${settingName}: ${error}`);
            continue;
          }
          
          // Update the cell if value is different
          const currentSheetValue = rowData[settingValueColIndex] || '';
          if (currentValue !== currentSheetValue) {
            Logger.log(`Updating row ${rowIndex}: ${settingName} = ${currentValue}`);
            sheet.getRange(rowIndex, settingValueColIndex + 1).setValue(currentValue);
            updatedCount++;
          } else {
            Logger.log(`No change needed for row ${rowIndex}: ${settingName}`);
          }
        }
        
      } catch (error) {
        Logger.log(`Error processing file ${fileName}: ${error.toString()}`);
      }
    }
    
    Logger.log(`Sync complete. Updated ${updatedCount} cells.`);
    
    return {
      success: true,
      updatedCount: updatedCount,
      filesProcessed: updatedFiles.length
    };
    
  } catch (error) {
    Logger.log(`Sync error: ${error.toString()}`);
    throw error;
  }
}

/**
 * Manual sync function (can be called from menu)
 */
function manualSyncFromShopify() {
  try {
    const ui = SpreadsheetApp.getUi();
    const result = ui.prompt(
      'Manual Sync',
      'Enter store name to sync from Shopify (e.g., AUS_Live):',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (result.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    const storeName = result.getResponseText().trim();
    if (!CONFIG.stores[storeName]) {
      ui.alert('Error', `Store "${storeName}" not found in configuration.`, ui.ButtonSet.OK);
      return;
    }
    
    // Mock some updated files for manual sync
    const mockUpdatedFiles = [
      'templates/collection.round-tt-table.json',
      'templates/collection.tt-table.json',
      'templates/collection.tt-table-to-desk.json'
    ];
    
    const mockThemeData = {
      id: 'manual-sync',
      name: CONFIG.stores[storeName].themeName,
      role: 'main'
    };
    
    const result_sync = syncShopifyChangesToSheet(storeName, mockThemeData, mockUpdatedFiles);
    
    ui.alert(
      'Sync Complete',
      `Manual sync completed for ${storeName}. Updated ${result_sync.updatedCount} cells.`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log(`Manual sync error: ${error.toString()}`);
    const ui = SpreadsheetApp.getUi();
    ui.alert('Error', `Manual sync failed: ${error.message}`, ui.ButtonSet.OK);
  }
}

// ===== ORIGINAL SHEET-TO-SHOPIFY SYNC FUNCTIONS =====

/**
 * Triggers when a cell is edited in the sheet
 */
function atEdit(e) {  // ✅ Using atEdit as per your custom trigger
  const scriptProperties = PropertiesService.getScriptProperties();
  
  // Check if webhook sync is in progress (prevent infinite loop)
  if (scriptProperties.getProperty('WEBHOOK_SYNC_IN_PROGRESS') === 'true') {
    Logger.log('Webhook sync in progress, skipping atEdit');
    return;
  }
  
  // Check if theme updates are disabled
  if (scriptProperties.getProperty('THEME_UPDATES_ENABLED') === 'false') {
    Logger.log('Automatic theme updates are currently disabled');
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      'Theme Updates Disabled',
      'Automatic theme updates are currently disabled. Changes will not be synced to Shopify.',
      ui.ButtonSet.OK
    );
    return;
  }

  Logger.log('Edit detected');
  
  try {
    // Get the edited cell's information
    const range = e.range;
    const sheet = range.getSheet();
    const sheetName = sheet.getName();
    
    Logger.log(`Edit in sheet: ${sheetName}`);
    
    // Check if this sheet corresponds to a configured store
    if (!CONFIG.stores[sheetName]) {
      Logger.log(`Sheet ${sheetName} is not configured as a store`);
      return;
    }
    
    // Get the headers
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Find the column indices for required columns
    const settingValueColIndex = headers.indexOf('Setting Value') + 1;
    
    // Check if Setting Value column exists
    if (settingValueColIndex === 0) {
      Logger.log('Setting Value column not found in the sheet');
      return;
    }
    
    // Get the range of edited cells
    const numRows = range.getNumRows();
    const numCols = range.getNumColumns();
    const startRow = range.getRow();
    const startCol = range.getColumn();
    
    Logger.log(`Processing ${numRows} rows and ${numCols} columns starting from row ${startRow}, column ${startCol}`);
    
    // Process each cell in the range
    for (let i = 0; i < numRows; i++) {
      const row = startRow + i;
      
      // Skip header row
      if (row === 1) {
        Logger.log(`Skipping header row ${row}`);
        continue;
      }
      
      for (let j = 0; j < numCols; j++) {
        const col = startCol + j;
        const editedColumn = headers[col - 1];
        
        Logger.log(`Processing row ${row}, column ${col} (${editedColumn})`);
        
        // Check if this is the Setting Value column
        if (editedColumn !== 'Setting Value') {
          Logger.log(`Skipping column ${editedColumn} - not Setting Value`);
          continue;
        }
        
        // Get the row data for this specific row
        const rowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
        
        // Extract data from the row
        const themeName = rowData[headers.indexOf('Theme Name')];
        const themeRole = rowData[headers.indexOf('Theme Role')];
        const fileName = rowData[headers.indexOf('File Name')];
        const sectionName = rowData[headers.indexOf('Section Name')];
        const blockName = rowData[headers.indexOf('Block Name')];
        const settingName = rowData[headers.indexOf('Setting Name')];
        const settingValue = rowData[headers.indexOf('Setting Value')];
        
        // Validate required fields
        if (!themeName || !fileName || !sectionName || !settingName) {
          Logger.log(`Skipping row ${row} - missing required data`);
          continue;
        }
        
        Logger.log(`Updating theme file for row ${row}:
          Store: ${sheetName}
          Theme: ${themeName}
          File: ${fileName}
          Section: ${sectionName}
          Block: ${blockName || 'N/A'}
          Setting: ${settingName}
          Value: ${settingValue}
        `);
        
        // Update the theme file for this row
        updateThemeFile(sheetName, themeName, fileName, sectionName, blockName, settingName, settingValue);
      }
    }
    
    Logger.log('Finished processing all edited cells');
    
  } catch (error) {
    Logger.log(`Error in atEdit: ${error.toString()}`);
    
    // Show error to user
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      'Theme Update Error',
      `Error processing edits: ${error.message}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Get theme ID by name
 */
function getThemeId(store, themeName) {
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
  
  const response = UrlFetchApp.fetch(
    `https://${store.domain}/admin/api/2025-04/graphql.json`,
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'X-Shopify-Access-Token': store.token
      },
      payload: JSON.stringify({ query: themesQuery })
    }
  );
  
  const data = JSON.parse(response.getContentText());
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${data.errors[0].message}`);
  }
  
  const themes = data.data.themes.nodes;
  Logger.log(`Available themes: ${themes.map(t => `${t.name} (${t.role})`).join(', ')}`);
  
  // Try exact match with MAIN role first
  let theme = themes.find(t => t.name === themeName && t.role === 'MAIN');
  
  if (!theme) {
    // Try exact name match with any role
    theme = themes.find(t => t.name === themeName);
  }
  
  if (!theme) {
    // Try partial name matching
    theme = themes.find(t => t.name.includes(themeName) || themeName.includes(t.name));
  }
  
  if (!theme) {
    throw new Error(`Theme "${themeName}" not found. Available: ${themes.map(t => `"${t.name}" (${t.role})`).join(', ')}`);
  }
  
  Logger.log(`Using theme: "${theme.name}" (${theme.role}) - ID: ${theme.id}`);
  return theme.id;
}

/**
 * Get current theme file content
 */
function getCurrentFileContent(store, themeId, filename) {
  const getThemeFileQuery = `
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
  
  const response = UrlFetchApp.fetch(
    `https://${store.domain}/admin/api/2025-04/graphql.json`,
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'X-Shopify-Access-Token': store.token
      },
      payload: JSON.stringify({
        query: getThemeFileQuery,
        variables: { themeId, filenames: [filename] }
      })
    }
  );
  
  const data = JSON.parse(response.getContentText());
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${data.errors[0].message}`);
  }
  
  const themeData = data.data.theme;
  if (!themeData || !themeData.files || !themeData.files.nodes.length) {
    throw new Error(`File ${filename} not found in theme ${themeId}`);
  }
  
  const file = themeData.files.nodes.find(f => f.filename === filename);
  if (!file || !file.body || !file.body.content) {
    throw new Error(`File ${filename} not found or has no content`);
  }
  
  const content = file.body.content;
  
  // Clean content (remove JS comments if present)
  let cleanContent = content;
  if (cleanContent.startsWith('/*')) {
    const commentEnd = cleanContent.indexOf('*/');
    if (cleanContent !== -1) cleanContent = cleanContent.substring(commentEnd + 2).trim();
  }
  const lastBrace = cleanContent.lastIndexOf('}');
  if (lastBrace !== -1) cleanContent = cleanContent.substring(0, lastBrace + 1);
  
  return JSON.parse(cleanContent);
}

/**
 * Update theme file content
 */
function updateThemeFileContent(store, themeId, filename, json) {
  const themeFilesUpsertMutation = `
    mutation themeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
      themeFilesUpsert(files: $files, themeId: $themeId) {
        upsertedThemeFiles { filename }
        userErrors { field message }
      }
    }
  `;
  
  const body = {
    type: 'TEXT',
    value: JSON.stringify(json, null, 2)
  };
  
  const response = UrlFetchApp.fetch(
    `https://${store.domain}/admin/api/2025-04/graphql.json`,
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'X-Shopify-Access-Token': store.token
      },
      payload: JSON.stringify({
        query: themeFilesUpsertMutation,
        variables: { themeId, files: [{ filename, body }] }
      })
    }
  );
  
  const data = JSON.parse(response.getContentText());
  const errors = data.data.themeFilesUpsert.userErrors;
  
  if (errors && errors.length > 0) {
    throw new Error(errors.map(e => e.message).join('; '));
  }
  
  return data.data.themeFilesUpsert.upsertedThemeFiles;
}

/**
 * Main function to update theme file
 */
function updateThemeFile(storeName, themeName, fileName, sectionName, blockName, settingName, settingValue) {
  Logger.log(`Starting theme file update for ${storeName} - Row with ${settingName}`);
  
  const store = CONFIG.stores[storeName];
  
  try {
    // Get theme ID
    const themeId = getThemeId(store, themeName);
    
    // Get current file content
    const json = getCurrentFileContent(store, themeId, fileName);
    
    // Update the JSON
    if (!json.sections[sectionName]) {
      Logger.log(`Section ${sectionName} not found in file`);
      return;
    }
    
    if (blockName) {
      // Update block setting
      if (!json.sections[sectionName].blocks[blockName]) {
        Logger.log(`Block ${blockName} not found in section ${sectionName}`);
        return;
      }
      
      if (!json.sections[sectionName].blocks[blockName].settings) {
        json.sections[sectionName].blocks[blockName].settings = {};
      }
      
      json.sections[sectionName].blocks[blockName].settings[settingName] = settingValue;
    } else {
      // Update section setting
      if (!json.sections[sectionName].settings) {
        json.sections[sectionName].settings = {};
      }
      
      json.sections[sectionName].settings[settingName] = settingValue;
    }
    
    // Update the file
    updateThemeFileContent(store, themeId, fileName, json);
    
    Logger.log(`✅ Successfully updated ${fileName} in theme ${themeName} - ${settingName}`);
    
  } catch (error) {
    Logger.log(`❌ Error updating theme file: ${error.toString()}`);
    
    // Show error to user
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      'Theme Update Error',
      `Failed to update theme file: ${error.message}`,
      ui.ButtonSet.OK
    );
  }
} 