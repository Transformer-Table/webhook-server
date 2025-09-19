# Webhook Server Setup Guide

This guide explains how to configure the webhook server for bidirectional Shopify theme sync with Google Sheets.

## Current Store Configurations

### DEV_STAGING_PROMO
- **Branch**: `DEV_STAGING_PROMO`
- **Store**: Configured via `DEV_STAGING_DOMAIN` environment variable
- **Theme**: `tt-ca/DEV_STAGING_PROMO`
- **Sheet**: `DEV_STAGING_PROMO`

### GCC
- **Branch**: `GCC`
- **Store**: Configured via `GCC_DOMAIN` environment variable
- **Theme**: `tt-ca/GCC_Staging`
- **Sheet**: `GCC`

### ROW_Staging
- **Branch**: `ROW_Staging`
- **Store**: ROW (configured via `ROW_DOMAIN` environment variable)
- **Theme**: `tt-ca/ROW_Staging` (unpublished theme)
- **Sheet**: `ROW`

## Required Environment Variables

### For Vercel Deployment
Add these environment variables in your Vercel dashboard:

```bash
# GitHub Webhook
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret

# Google Apps Script
APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbws33y8g_nhVDayDi4uo9IWbO2zBdkdcucyougNER0FnFso4ajTFZ_3WrYKq8o0EaWz/exec

# Shopify Configuration for DEV_STAGING_PROMO
DEV_STAGING_DOMAIN=your-dev-staging-store.myshopify.com
DEV_STAGING_ACCESS_TOKEN=your_dev_staging_shopify_access_token

# Shopify Configuration for GCC
GCC_DOMAIN=your-gcc-store.myshopify.com
GCC_ACCESS_TOKEN=your_gcc_shopify_access_token

# Shopify Configuration for ROW
ROW_DOMAIN=your-row-store.myshopify.com
ROW_ACCESS_TOKEN=your_row_shopify_access_token

# Additional stores can be added using the pattern:
# {PREFIX}_DOMAIN=your-store.myshopify.com
# {PREFIX}_ACCESS_TOKEN=your_access_token
# {PREFIX}_THEME_NAME=your-theme-name
```

### Environment Variable Patterns

The system now supports dynamic configuration through environment variables:

- **Domain Configuration**: `{PREFIX}_DOMAIN` - The Shopify store domain
- **Access Token**: `{PREFIX}_ACCESS_TOKEN` - The Shopify access token for the store
- **Theme Name**: `{PREFIX}_THEME_NAME` - The theme name to sync with (optional, falls back to hardcoded values)

This allows you to easily add new stores without modifying the code.

## How It Works

1. **GitHub Push Webhook**: When files are pushed to a configured branch (e.g., `ROW_Staging`), GitHub sends a webhook to this server.

2. **File Change Detection**: The server analyzes the push to identify changed theme files (assets/, config/, layout/, locales/, sections/, snippets/, templates/).

3. **Shopify API Integration**: For each changed file, the server:
   - Fetches the current content from the Shopify theme using GraphQL API
   - Extracts section and block settings from the JSON content
   - Identifies all sections and their corresponding settings/blocks

4. **Google Sheets Update**: The extracted data is sent to the Google Apps Script, which:
   - Finds matching rows in the appropriate sheet (e.g., `ROW_Staging`)
   - Updates the setting values for matching filename/section/block combinations

## Adding a New Store

To add a new store configuration:

1. **Update `api/config.js`** and **`api/index.js`**:
```javascript
const BRANCH_CONFIG = {
  // ... existing configs
  'YOUR_BRANCH_NAME': {
    storeName: 'YOUR_STORE_NAME',
    shopifyDomain: 'your-store.myshopify.com',
    themeName: 'tt-ca/YOUR_THEME_NAME'
  }
};
```

2. **Update `api/shopify-client.js`**:
```javascript
const domainToEnvVar = {
  // ... existing mappings
  'your-store.myshopify.com': 'YOUR_STORE_ACCESS_TOKEN'
};
```

3. **Add Environment Variables**:
```bash
YOUR_STORE_ACCESS_TOKEN=your_shopify_access_token
```

4. **Create Google Sheet**: Add a new sheet named `YOUR_STORE_NAME` in your Google Sheets workbook with the same column structure.

## Shopify App Permissions Required

Your Shopify private app needs these permissions:
- **Themes**: `read_themes` - To access theme files and content

## Data Format Sent to Apps Script

The server sends this payload to your Google Apps Script:

```json
{
  "action": "updateFromWebhook",
  "data": {
    "storeName": "ROW_Staging",
    "shopifyDomain": "transformer-table-rest-of-world-staging.myshopify.com",
    "themeName": "tt-ca/ROW_Staging",
    "branch": "ROW_Staging",
    "extractedSettings": [
      {
        "filename": "templates/collection.tt-table.json",
        "sectionName": "section_the_only_banner_DAVNJH",
        "blockName": "",
        "settingName": "heading",
        "settingValue": "<p>Transformer <br/>Dining Set</p>"
      },
      {
        "filename": "templates/collection.tt-table.json",
        "sectionName": "section_financing_banner_PLbTkz",
        "blockName": "text_tLbdWa",
        "settingName": "text",
        "settingValue": "<p>The World Renowned Transformer Table is Here! ...</p>"
      }
    ],
    "timestamp": "2025-01-03T16:33:14.772Z"
  }
}
```

## Google Apps Script Integration

Your Apps Script should:

1. Receive the webhook payload
2. Iterate through `extractedSettings`
3. For each setting, find matching rows in the appropriate sheet where:
   - Column "File Name" matches `filename`
   - Column "Section Name" matches `sectionName` 
   - Column "Block Name" matches `blockName` (if not empty)
   - Column "Setting Name" matches `settingName`
4. Update the "Setting Value" column with the new `settingValue`

## Troubleshooting

### Environment Variables
- Check that all required environment variables are set in Vercel
- Verify Shopify access tokens have the correct permissions
- Confirm the Apps Script URL is accessible

### Theme File Issues
- Ensure theme names match exactly between GitHub and Shopify
- Verify the theme is published and accessible
- Check that the files contain valid JSON structure

### Google Sheets Issues
- Confirm the sheet name matches the `storeName` in the configuration
- Verify the Apps Script URL is correct and deployed
- Check Apps Script logs for any processing errors

## Testing

You can test the webhook by:
1. Making a change to a theme file in the configured branch
2. Pushing the change to GitHub
3. Checking the Vercel logs for webhook processing
4. Verifying the Google Sheet is updated with the new values 