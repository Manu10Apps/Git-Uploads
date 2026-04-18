# Stripe Account Configuration Update

**New Stripe Account Details:**
- Account ID: `acct_1TNcoK2QRJgSivgH`
- Publishable Key (Live): `pk_live_51TNcoK2QRJgSivgHk8Lcl1FqEW8ORqdlnhCHLAIdnmFV6L37Z1pGbtmtAcIXN7BoiBCWGgyJtPuWXqhA1lJP4TEN006SjH1dIj`

---

## Step 1: Update Local Development Environment

**Windows (PowerShell):**

```powershell
# Create or edit .env.local file
Set-Content -Path ".env.local" -Value @"
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_51TNcoK2QRJgSivgHk8Lcl1FqEW8ORqdlnhCHLAIdnmFV6L37Z1pGbtmtAcIXN7BoiBCWGgyJtPuWXqhA1lJP4TEN006SjH1dIj
STRIPE_ACCOUNT_ID=acct_1TNcoK2QRJgSivgH
"@

# Verify file was created
Get-Content ".env.local"
```

**Or manually:**
1. Open `.env.local` in VS Code (create it if missing, in project root)
2. Add these lines:
```
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_51TNcoK2QRJgSivgHk8Lcl1FqEW8ORqdlnhCHLAIdnmFV6L37Z1pGbtmtAcIXN7BoiBCWGgyJtPuWXqhA1lJP4TEN006SjH1dIj
STRIPE_ACCOUNT_ID=acct_1TNcoK2QRJgSivgH
```

⚠️ **Important:** Replace `sk_live_YOUR_SECRET_KEY_HERE` with your actual Stripe **Secret Key** (found in Stripe Dashboard → Developers → API Keys)

---

## Step 2: Update Production Deployment (Dokploy)

### Via Dokploy Dashboard:

1. **Log in to Dokploy** → Your Application → Settings
2. **Environment Variables** section
3. Add/Update these variables:
   ```
   STRIPE_SECRET_KEY=sk_live_[YOUR_SECRET_KEY]
   STRIPE_PUBLISHABLE_KEY=pk_live_51TNcoK2QRJgSivgHk8Lcl1FqEW8ORqdlnhCHLAIdnmFV6L37Z1pGbtmtAcIXN7BoiBCWGgyJtPuWXqhA1lJP4TEN006SjH1dIj
   STRIPE_ACCOUNT_ID=acct_1TNcoK2QRJgSivgH
   ```
4. **Save** and **Redeploy**

### Via SSH (Alternative):

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Edit environment file (if using .env file on VPS)
nano /path/to/app/.env

# Add/update:
STRIPE_SECRET_KEY=sk_live_[YOUR_SECRET_KEY]
STRIPE_PUBLISHABLE_KEY=pk_live_51TNcoK2QRJgSivgHk8Lcl1FqEW8ORqdlnhCHLAIdnmFV6L37Z1pGbtmtAcIXN7BoiBCWGgyJtPuWXqhA1lJP4TEN006SjH1dIj
STRIPE_ACCOUNT_ID=acct_1TNcoK2QRJgSivgH

# Restart container
docker restart <container-id>
```

---

## Step 3: Get Your Secret Key from Stripe

1. Log in to **Stripe Dashboard** → https://dashboard.stripe.com
2. Navigate to **Developers** → **API Keys**
3. Look for your **Secret Key** (starts with `sk_live_`)
4. ⚠️ **Keep this secret! Never commit to git.**
5. Copy and use in Step 1 & 2 above

---

## Step 4: Verify Configuration

**Test locally:**
```bash
# Navigate to project directory
cd /path/to/project

# Start development server
npm run dev

# Visit premium page and test Stripe payment button
# Open: http://localhost:3000/premium
```

**Test production:**
```bash
# After deploying to Dokploy
curl https://intambwemedia.com/api/stripe/checkout-session \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "currency": "usd",
    "successUrl": "https://intambwemedia.com/premium?success=true",
    "cancelUrl": "https://intambwemedia.com/premium?cancel=true"
  }'

# Expected response:
# {"sessionId": "cs_test_...", "url": "https://checkout.stripe.com/pay/..."}
```

---

## Step 5: Update Stripe Dashboard Settings

Log in to **Stripe Dashboard** and configure:

### Webhook Endpoints:
```
POST https://intambwemedia.com/api/webhooks/stripe
```

### Return URLs (for your premium page):
- Success: `https://intambwemedia.com/premium?success=true`
- Cancel: `https://intambwemedia.com/premium?cancel=true`

---

## Checklist

```
□ Retrieved Secret Key from Stripe Dashboard
□ Updated .env.local with new keys (local development)
□ Updated Dokploy environment variables (production)
□ Redeployed application on Dokploy
□ Tested payment endpoint locally
□ Tested payment endpoint in production
□ Configured Stripe webhooks (if using)
□ Updated webhook endpoints in Stripe Dashboard
```

---

## Troubleshooting

### "Stripe API key not configured"
- Verify `STRIPE_SECRET_KEY` environment variable is set
- Restart dev server: `npm run dev`
- Check `.env.local` file exists in project root

### Payments not working
- Confirm all three variables are set correctly:
  - `STRIPE_SECRET_KEY` (starts with `sk_live_`)
  - `STRIPE_PUBLISHABLE_KEY` (provided above)
  - `STRIPE_ACCOUNT_ID` (provided above)
- Clear browser cache and retry
- Check Stripe Dashboard → Logs for errors

### Production issues
- SSH into VPS and restart container: `docker restart <id>`
- Check logs: `docker logs <container-id> | grep -i stripe`
- Verify environment variables: `docker exec <container-id> env | grep STRIPE`

---

**Status:** 🟢 Ready to configure  
**Account:** acct_1TNcoK2QRJgSivgH

