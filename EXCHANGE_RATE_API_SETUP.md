# Exchange Rate API Setup Guide

This guide explains how to set up and use the new exchange rate update system for AMAKURU24.

## Overview

The system automatically updates USD, EUR, and GBP exchange rates daily from an external API and stores them in the database. This allows:

- **Centralized rate management**: Rates are stored in your database
- **Daily updates**: Automatic updates via a scheduled cron job
- **Change tracking**: Historical percentage changes are calculated
- **Reduced API calls**: TopBar component fetches from your API, not external providers

## Architecture

### Components

1. **Database Model** (`prisma/schema.prisma`)
   - `ExchangeRate` table stores current rates and percentage change

2. **API Endpoints**
   - **GET `/api/admin/exchange-rates`**: Fetch all current rates
   - **POST `/api/admin/exchange-rates`**: Update rates (admin only)
   - **POST `/api/cron/update-exchange-rates`**: Daily scheduled update

3. **Utility Function** (`lib/exchange-rates.ts`)
   - Fetches rates from exchangerate-api.com
   - Calculates percentage changes
   - Updates via internal API

4. **Frontend** (`app/components/TopBar.tsx`)
   - Now fetches from `/api/admin/exchange-rates`
   - Displays rates with change indicators (↑/↓)

## Setup Instructions

### 1. Environment Configuration

Add these variables to your `.env.local`:

```bash
# Secret key for admin exchange rate updates (create a strong random key)
EXCHANGE_RATE_API_KEY=your-super-secret-key-here

# Secret key for cron job authentication
CRON_SECRET=your-cron-job-secret-here
```

Generate strong keys using:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Initialize Database with Rates

Run this manually once to populate the database:

```bash
curl -X POST http://localhost:3000/api/admin/exchange-rates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_EXCHANGE_RATE_API_KEY" \
  -d '{
    "rates": [
      {"currency": "USD", "rate": 1461.99},
      {"currency": "EUR", "rate": 1694.92},
      {"currency": "GBP", "rate": 1953.13}
    ]
  }'
```

### 3. Set Up Daily Cron Job

Choose one of these options:

#### Option A: cron-job.org (Recommended for VPS)

1. Go to https://cron-job.org/en/
2. Create an account
3. Create a new cron job with:
   - **URL**: `https://yourdomain.com/api/cron/update-exchange-rates`
   - **Method**: POST
   - **Headers**:
     - `Authorization: Bearer YOUR_CRON_SECRET`
   - **Schedule**: Daily at your preferred time (e.g., 00:00 UTC)

#### Option B: Vercel Cron (If deployed on Vercel)

Add to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-exchange-rates",
      "schedule": "0 0 * * *"
    }
  ]
}
```

#### Option C: Railway/Dokploy Scheduled Tasks

Use the platform's built-in scheduler to call the endpoint daily.

#### Option D: Node.js Cron (Local/Internal)

You can also use a cron library in a background service, but external services are more reliable.

### 4. Test the System

#### Test GET endpoint (fetch current rates):

```bash
curl http://localhost:3000/api/admin/exchange-rates
```

Expected response:

```json
{
  "success": true,
  "data": [
    { "currency": "USD", "rate": 1461.99, "change": 0 },
    { "currency": "EUR", "rate": 1694.92, "change": 0 },
    { "currency": "GBP", "rate": 1953.13, "change": 0 }
  ]
}
```

#### Test cron endpoint (trigger update):

```bash
curl -X POST http://localhost:3000/api/cron/update-exchange-rates \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### Test TopBar update:

Open the website and check if the footer shows the exchange rates. They should update every minute on page load.

## Files Created/Modified

### New Files

- `app/api/admin/exchange-rates/route.ts` - Exchange rates API endpoints
- `app/api/cron/update-exchange-rates/route.ts` - Cron job endpoint
- `lib/exchange-rates.ts` - Utility function for fetching and updating rates
- `prisma/migrations/20260307212235_add_exchange_rates/` - Database migration

### Modified Files

- `prisma/schema.prisma` - Added ExchangeRate model
- `app/components/TopBar.tsx` - Updated to use internal API

## Monitoring

You can add logging and monitoring:

1. **Check migration status**:

   ```bash
   npx prisma studio
   ```

   Navigate to `exchange_rates` table to see entries

2. **Check API logs**:
   Look for logs from `/api/cron/update-exchange-rates` endpoint in your server logs

3. **Database query**:
   ```bash
   npx prisma studio  # Open Prisma Studio to view records
   ```

## Troubleshooting

### Rates showing as 0 or undefined

- Ensure the cron job has run at least once
- Check that `EXCHANGE_RATE_API_KEY` and `CRON_SECRET` are set correctly
- Manually trigger an update with the curl command above

### Cron job not running

- Verify the URL is accessible publicly
- Check that `CRON_SECRET` matches your cron service configuration
- Review server logs for any errors

### API quota exceeded

- We use exchangerate-api.com which has a free tier limit
- Limit updates to once daily
- Consider upgrading the API plan if needed

## Security Notes

- **API Keys**: Never commit `.env.local` to git
- **Authentication**: All endpoints check for valid API keys
- **Rate Limiting**: Consider adding rate limiting in production
- **HTTPS**: Ensure cron jobs use HTTPS in production

## Next Steps

1. Set up `.env.local` with your secrets
2. Start the dev server: `npm run dev`
3. Test the endpoints
4. Set up your cron job service
5. Monitor the first daily update
