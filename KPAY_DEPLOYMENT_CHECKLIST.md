# KPay Rwanda Integration - Deployment Checklist

This checklist walks you through deploying the KPay Rwanda payment system for Intambwe Media's Premium/Ifatabuguzi feature.

## Phase 1: KPay Account Setup

### 1.1 Create KPay Account

- [ ] Visit [https://kpay.rw/](https://kpay.rw/)
- [ ] Click "Sign Up" or "Register"
- [ ] Enter organization name: **Intambwe Media**
- [ ] Provide email address
- [ ] Create secure password
- [ ] Verify email address

### 1.2 Complete KYC Verification

- [ ] Log in to KPay dashboard
- [ ] Navigate to **Profile** → **Verification**
- [ ] Upload business registration documents
- [ ] Provide business address (Rwanda)
- [ ] Confirm contact person: Emmanuel Ndahayo
- [ ] Add phone: 0788823265
- [ ] Wait for KYC approval (usually 24-48 hours)
- [ ] Confirm approval email received

### 1.3 Get API Credentials

- [ ] Log in to KPay dashboard
- [ ] Navigate to **Settings** → **API**
- [ ] Click "Generate New Credentials" or view existing credentials
- [ ] Copy **API Key** (keep secure - don't share)
- [ ] Copy **Merchant ID**
- [ ] Copy **API URL**: https://api.kpay.rw
- [ ] View **Webhook Secret** (note this down)

**Write down your credentials:**

```
API Key:        _____________________________
Merchant ID:    _____________________________
Webhook Secret: _____________________________
API URL:        https://api.kpay.rw
```

## Phase 2: Environment Configuration

### 2.1 Create .env.local File

If you don't already have `./.env.local` in project root:

```bash
# In project root directory
touch .env.local
```

### 2.2 Add Environment Variables

Edit `.env.local` and add (use credentials from Phase 1.3):

```env
# KPay Rwanda Configuration
KPAY_API_KEY=paste_your_api_key_here
KPAY_MERCHANT_ID=paste_your_merchant_id_here
KPAY_API_URL=https://api.kpay.rw
KPAY_WEBHOOK_SECRET=paste_your_webhook_secret_here
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# For local development:
# NEXT_PUBLIC_APP_URL=http://localhost:3000

# For production (adjust domain):
# NEXT_PUBLIC_APP_URL=https://intambwemedia.rw
```

**Important**:

- Replace the values with your actual KPay credentials
- Keep `.env.local` out of version control (should be in .gitignore)
- Use `https://api.kpay.rw` exactly as shown

### 2.3 Verify .env.local is Ignored

Check that `.gitignore` includes `.env.local`:

```bash
# In project root
grep -E "^\.env" .gitignore
# Should output: .env, .env.local, .env.*.local, etc.
```

If `.env.local` is not in .gitignore, add it:

```bash
echo ".env.local" >> .gitignore
```

- [ ] `.env.local` exists in project root
- [ ] Contains all 5 required variables
- [ ] Is included in `.gitignore`
- [ ] Variables are not committed to git

## Phase 3: Webhook Configuration

### 3.1 Register Webhook in KPay Dashboard

- [ ] Log in to KPay dashboard
- [ ] Navigate to **Settings** → **Webhooks**
- [ ] Click "Add Webhook" or "Add New Webhook"
- [ ] Enter webhook URL: `https://yourdomain.com/api/premium/webhook`
  - For local testing: Use ngrok or similar to expose localhost: `https://your-ngrok-domain.ngrok.io/api/premium/webhook`
- [ ] Select Event Type: `payment.completed`
- [ ] Enable webhook (toggle to "Active")
- [ ] Click "Save" or "Add"

### 3.2 Test Webhook Delivery

- [ ] Click "Send Test Webhook" (if available)
- [ ] Check server logs: should see POST request to `/api/premium/webhook`
- [ ] Verify webhook signature verification passes (no 401 errors)

## Phase 4: Code Verification

### 4.1 Check API Endpoints

The following files should be updated for KPay:

**File: `/app/api/premium/payment/route.ts`**

- [ ] Contains KPAY_API_KEY, KPAY_MERCHANT_ID, KPAY_API_URL
- [ ] POST request to `${KPAY_API_URL}/v1/payments`
- [ ] Amount validation: `amount >= 200` (no upper limit)
- [ ] Headers include: `Authorization: Bearer ${KPAY_API_KEY}`
- [ ] Headers include: `X-Merchant-ID: ${KPAY_MERCHANT_ID}`
- [ ] Phone validation for MTN (0788/0789) and Airtel (0703-0706)
- [ ] Returns: `{ success, message, transactionId, amount, receiver }`

**File: `/app/api/premium/verify/route.ts`**

- [ ] GET endpoint accepts `tx_ref` query parameter
- [ ] Calls: `${KPAY_API_URL}/v1/payments/{transactionId}`
- [ ] Checks status: `success` or `completed`
- [ ] Returns payment details with status

**File: `/app/api/premium/webhook/route.ts`**

- [ ] Verifies webhook signature using KPAY_WEBHOOK_SECRET
- [ ] Handles `payment.completed` or `payment.success` events
- [ ] Logs successful payments
- [ ] Returns 200 OK on success

**File: `/app/components/Header.tsx`**

- [ ] Button text is "Ifatabuguzi" (Premium)
- [ ] Button link is `/premium`
- [ ] Both desktop and mobile versions updated

**File: `/app/premium/page.tsx`**

- [ ] Amount presets: [200, 500, 1000, 1500, 2000]
- [ ] Phone input accepts RWandan numbers
- [ ] Calls POST `/api/premium/payment`
- [ ] Shows receiver: "Emmanuel Ndahayo (0788823265)"
- [ ] Auto-verifies after 30 seconds via GET `/api/premium/verify`

### 4.2 Verify All Code Changes

```bash
# In project root, run:
grep -r "KPAY_" app/api/premium/
# Should show all three files using KPAY_ variables

grep -r "Ifatabuguzi" app/components/
# Should show button text in Header.tsx

grep -r "Emmanuel Ndahayo" app/
# Should show receiver info in premium/page.tsx
```

- [ ] All three API routes contain KPay references
- [ ] Header button says "Ifatabuguzi"
- [ ] Premium page shows receiver info
- [ ] No Flutterwave references in API code

## Phase 5: Local Testing

### 5.1 Start Development Server

```bash
# In project root
npm install  # if needed
npm run dev
```

- [ ] Server starts on http://localhost:3000
- [ ] No errors in terminal or browser console

### 5.2 Test Premium Page

- [ ] Navigate to http://localhost:3000/premium
- [ ] See "Ifatabuguzi" (Premium) button in header
- [ ] Page loads with payment form
- [ ] See receiver info: "Emmanuel Ndahayo (0788823265)"
- [ ] Amount presets visible: 200, 500, 1000, 1500, 2000

### 5.3 Test Payment Form

- [ ] Select amount "500"
- [ ] Enter phone number "0788823265"
- [ ] Click "Rema icyuma" (Pay)
- [ ] Should see: "Ayiswe umusaza w'icyuma" (Payment initiated)
- [ ] Should display transaction ID: "INTAMBWE-..."
- [ ] Should show status message (blue/green)

**Expected API Behavior:**

- Request sent to KPay: `POST https://api.kpay.rw/v1/payments`
- Response contains: `transactionId`, `amount`, `message`
- Phone user receives USSD prompt (if configured in KPay)

### 5.4 Test Webhook (Local)

For local testing, use ngrok:

```bash
# In separate terminal
ngrok http 3000

# This gives you: https://xxxx-xx-xxx-xx.ngrok.io
# Use this URL for webhook: https://xxxx-xx-xxx-xx.ngrok.io/api/premium/webhook
```

- [ ] Update webhook URL in KPay dashboard with ngrok URL
- [ ] Trigger test webhook from KPay dashboard
- [ ] Check server logs for POST request
- [ ] Verify signature verification passes (no 401 errors)

## Phase 6: Production Deployment

### 6.1 Update Production Environment Variables

Deploy `.env.local` credentials to your hosting platform:

**For Vercel:**

```bash
# Install Vercel CLI
npm install -g vercel

# Set environment variables
vercel env add KPAY_API_KEY
vercel env add KPAY_MERCHANT_ID
vercel env add KPAY_API_URL
vercel env add KPAY_WEBHOOK_SECRET
vercel env add NEXT_PUBLIC_APP_URL
```

**For other platforms** (Firebase, AWS, etc.):

- Add environment variables in platform dashboard
- Use exact variable names from Phase 2.2

- [ ] All 5 environment variables set in production
- [ ] Values match KPay credentials
- [ ] NEXT_PUBLIC_APP_URL points to production domain

### 6.2 Update Webhook URL for Production

- [ ] Log in to KPay dashboard
- [ ] Update webhook URL from local/ngrok to: `https://yourdomain.com/api/premium/webhook`
- [ ] Replace `yourdomain.com` with actual production domain
- [ ] Send test webhook and verify it's received
- [ ] Check production logs for successful webhook delivery

### 6.3 Deploy Code

```bash
# Option 1: Vercel
vercel deploy --prod

# Option 2: Push to git (if auto-deploy configured)
git add .
git commit -m "KPay Rwanda integration deployment"
git push origin main

# Option 3: Manual deployment
npm run build
# Deploy dist/ or .next/ folder to your server
```

- [ ] Code deployed to production
- [ ] No errors in production logs
- [ ] Premium page accessible at https://yourdomain.com/premium

## Phase 7: Production Verification

### 7.1 Test Premium Page in Production

- [ ] Visit https://yourdomain.com
- [ ] Click "Ifatabuguzi" button in header
- [ ] Should navigate to https://yourdomain.com/premium
- [ ] Payment form loads correctly
- [ ] Receiver info visible

### 7.2 Test Production Payment

- [ ] Select amount: 200 RWF
- [ ] Enter valid MTN number: 0788xxxxxxx
- [ ] Click "Rema icyuma"
- [ ] Should receive response with transaction ID
- [ ] Transaction appears in KPay dashboard

### 7.3 Monitor First Payments

- [ ] Watch KPay dashboard for real payments
- [ ] Confirm payments reach Emmanuel Ndahayo's account
- [ ] Check webhook deliveries in KPay logs
- [ ] Verify transaction IDs match (INTAMBWE-...)
- [ ] Monitor server error logs for any issues

- [ ] First test payment successful
- [ ] Payment visible in KPay dashboard
- [ ] Emmanuel Ndahayo received funds
- [ ] Webhook delivered successfully

## Phase 8: Optional Enhancements

### 8.1 Database Integration (Recommended)

Implement database storage for payment records:

1. Create `payments` table using schema from KPAY_SETUP.md
2. Uncomment database code in `/api/premium/webhook/route.ts`
3. Store all payment transactions for audit trail
4. Enable refund queries and reporting

- [ ] Database table created
- [ ] Webhook stores payment records
- [ ] Can query payment history

### 8.2 Email Notifications (Optional)

Add email confirmations to Emmanuel Ndahayo:

1. Send email with: amount, phone, transaction ID, timestamp
2. Use email service: SendGrid, AWS SES, or similar
3. Template: Payment received notification

- [ ] Email service integrated
- [ ] Emmanuel receives payment confirmations

### 8.3 Analytics Integration (Optional)

Track payment metrics:

1. Monitor payment amounts and frequency
2. Track successful vs failed transactions
3. Identify peak payment times
4. Analyze user retention via premium conversions

- [ ] Analytics dashboard set up
- [ ] Payment metrics tracked

## Phase 9: Troubleshooting

### Issue: "Invalid phone number" Error

- [ ] Check phone starts with 0788, 0789, 0703-0706
- [ ] No spaces or special characters
- [ ] Try with +250 format: +250788823265

### Issue: "API Connection Failed"

- [ ] Verify KPAY_API_KEY is correct
- [ ] Verify KPAY_MERCHANT_ID is correct
- [ ] Check KPAY_API_URL is exactly: https://api.kpay.rw
- [ ] Verify internet connection
- [ ] Check KPay service status

### Issue: Webhook Not Received

- [ ] Verify webhook URL is publicly accessible
- [ ] Check webhook URL in KPay dashboard matches production URL
- [ ] Look for webhook in KPay dashboard logs
- [ ] Try "Send Test Webhook" from dashboard
- [ ] Check application error logs

### Issue: Payment Initiated But Not Confirmed

- [ ] Wait 30+ seconds (auto-verification happens)
- [ ] Check KPay dashboard for transaction
- [ ] Verify payment actually reached Emmanuel's account
- [ ] Check webhook delivery in KPay logs

## Quick Reference: API Endpoints

| Endpoint               | Method | Purpose              |
| ---------------------- | ------ | -------------------- |
| `/api/premium/payment` | POST   | Initiate payment     |
| `/api/premium/verify`  | GET    | Check payment status |
| `/api/premium/webhook` | POST   | Webhook receiver     |

## Quick Reference: Environment Variables

```env
KPAY_API_KEY=from_kpay_settings
KPAY_MERCHANT_ID=from_kpay_settings
KPAY_API_URL=https://api.kpay.rw
KPAY_WEBHOOK_SECRET=from_kpay_settings
NEXT_PUBLIC_APP_URL=your_domain_or_localhost
```

## Success Criteria

Your deployment is successful when:

✅ Premium button ("Ifatabuguzi") visible in header  
✅ Premium page loads at `/premium` route  
✅ Payment form accepts 200-2000 RWF amounts  
✅ Phone validation works correctly (MTN/Airtel)  
✅ Test payment succeeds and shows transaction ID  
✅ Webhook receives payment confirmations  
✅ Payment appears in Emmanuel's account  
✅ Error messages display in user's language  
✅ No Flutterwave references in code  
✅ `.env.local` not committed to git

## Support

**KPay Rwanda:**

- Email: support@kpay.rw
- Dashboard: https://dashboard.kpay.rw/
- Docs: https://docs.kpay.rw/
- Status: https://status.kpay.rw/

**Intambwe Media:**

- Check logs: `npm run dev` output
- Check browser console: F12 → Console tab
- Check server error logs

## Next Steps

1. ✅ Complete Phase 1-3 above
2. ✅ Verify Phase 4 code changes
3. ✅ Test locally (Phase 5)
4. ✅ Deploy to production (Phase 6)
5. ✅ Verify production (Phase 7)
6. ⚠️ Monitor first week for issues
7. 📈 Consider Phase 8 enhancements

---

**Deployed by:** [Your Name]  
**Deployment Date:** [Date]  
**KPay Account:** Intambwe Media  
**Receiver:** Emmanuel Ndahayo (0788823265)
