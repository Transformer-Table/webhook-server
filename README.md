# Shopify Theme Webhook Server

A Node.js webhook server that receives Shopify theme update notifications and syncs changes back to Google Sheets via Google Apps Script.

## 🚀 Features

- ✅ Secure webhook verification with HMAC signatures
- ✅ Multi-store support (Live + Staging environments)
- ✅ Automatic Google Apps Script integration
- ✅ Theme file change detection
- ✅ Error handling and logging
- ✅ Health checks and monitoring
- ✅ Vercel deployment ready

## 📋 Prerequisites

- Node.js 18+ 
- Shopify store(s) with theme access
- Google Apps Script with web app deployed
- Vercel account (for deployment)

## 🛠️ Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd webhook-server
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Port for the webhook server
PORT=3000

# Google Apps Script Web App URL (get from Apps Script deployment)
APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

# Webhook secrets for each store (get from Shopify webhook creation)
US_WEBHOOK_SECRET=your_us_live_webhook_secret_here
UK_WEBHOOK_SECRET=your_uk_live_webhook_secret_here
EU_WEBHOOK_SECRET=your_eu_live_webhook_secret_here
# ... add all your store secrets
```

### 3. Update Store Configuration

Edit the `STORE_CONFIG` object in `index.js` to match your actual store domains:

```javascript
const STORE_CONFIG = {
  'your-actual-store.myshopify.com': {
    storeName: 'US_Live',
    webhookSecret: process.env.US_WEBHOOK_SECRET
  },
  // ... add all your stores
};
```

### 4. Deploy Google Apps Script

Update your Google Apps Script with the webhook handling code (provided separately).

## 🌐 Deployment

### Local Development

```bash
npm run dev
```

Server will run on `http://localhost:3000`

### Production (Vercel)

1. Push your code to GitHub
2. Connect GitHub repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

Your webhook URL will be: `https://your-app.vercel.app/webhook/theme-update`

## 📡 Shopify Webhook Setup

For each store, set up the webhook in Shopify Admin:

1. Go to **Settings** → **Notifications**
2. Scroll to **Webhooks** section
3. Click **Add webhook**
4. Configure:
   - **Event**: `Theme update`
   - **Format**: `JSON`
   - **URL**: `https://your-app.vercel.app/webhook/theme-update`
   - **API Version**: Latest
5. Save and note the webhook secret

## 🔧 API Endpoints

### Health Check
```
GET /health
```
Returns server health status.

### Configuration Check
```
GET /config
```
Returns store configuration (for debugging).

### Theme Update Webhook
```
POST /webhook/theme-update
```
Main endpoint for Shopify theme webhooks.

### Test Webhook
```
POST /test/webhook
```
Manual testing endpoint.

## 📊 Monitoring

### Logs

The server provides detailed logging:
- Webhook receipts
- Verification results
- Apps Script calls
- Error details

### Health Checks

Use `/health` endpoint for monitoring:

```bash
curl https://your-app.vercel.app/health
```

## 🔍 Troubleshooting

### Common Issues

1. **Webhook Verification Failed**
   - Check webhook secret in `.env`
   - Ensure secret matches Shopify webhook configuration

2. **Store Not Configured**
   - Update `STORE_CONFIG` with correct domain
   - Check domain format (should match Shopify's domain exactly)

3. **Apps Script Error**
   - Verify `APPS_SCRIPT_URL` is correct
   - Check Apps Script deployment permissions

### Debug Mode

Set `NODE_ENV=development` for verbose logging.

## 🔐 Security

- ✅ Webhook signature verification
- ✅ HTTPS enforcement
- ✅ Input validation
- ✅ Environment variable protection
- ✅ CORS and security headers

## 📚 Architecture

```
Shopify Store → Webhook Server → Google Apps Script → Google Sheets
     ↓              ↓                    ↓              ↓
Theme Update → Verify & Parse → Process Update → Update Cells
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details. 