# KPay Rwanda Payment Integration Setup

This guide explains how to set up the KPay Rwanda payment integration for Intambwe Media's Premium/Ifatabuguzi feature.

## Overview

The payment system integrates with **KPay Rwanda API** to accept mobile money payments from MTN and Airtel networks. Payments are sent directly to **Emmanuel Ndahayo** at `0788823265`.

**Payment amounts**: 200 RWF and above with no upper limit

## Environment Variables

Add the following variables to your `.env.local` file:

```env
# KPay Rwanda Configuration
KPAY_API_KEY=your_kpay_api_key
KPAY_MERCHANT_ID=your_merchant_id
KPAY_API_URL=https://api.kpay.rw
KPAY_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Getting Your KPay Credentials

1. **Sign Up**: Go to [https://kpay.rw/](https://kpay.rw/)
2. **Create Account**: Register your organization/media outlet
3. **Complete Verification**: Provide business details and documents
4. **Get API Credentials**:
   - Navigate to **Dashboard** → **Settings** → **API**
   - Copy your **API Key** and **Merchant ID**
   - Note the **Webhook Secret** for signature verification

## API Endpoints

KPay Rwanda uses the following endpoints:

- **Payment Initiation**: `POST https://api.kpay.rw/v1/payments`
- **Payment Verification**: `GET https://api.kpay.rw/v1/payments/{transactionId}`
- **Webhook Events**: Your registered webhook URL

### Required Headers

All requests to KPay API require:

```
Authorization: Bearer {KPAY_API_KEY}
X-Merchant-ID: {KPAY_MERCHANT_ID}
Content-Type: application/json
```

## Webhook Configuration

After getting your credentials:

1. Go to **Dashboard** → **Settings** → **Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/premium/webhook`
3. Select events: `payment.completed`
4. Note the **Webhook Secret** for signature verification
5. Save and the system will send test webhook
6. Verify webhook receipt in KPay dashboard

## Payment Flow

### User Flow:

1. User visits `/premium` page
2. Selects amount from presets (200, 500, 1000, 1500, 2000 RWF) or higher
3. Enters RWandan phone number (MTN/Airtel)
4. Clicks "Rema icyuma" (Pay Now)
5. API initiates KPay payment
6. User receives USSD prompt on phone
7. User confirms payment via USSD
8. Payment webhook received
9. Payment status updated in system

### API Request/Response:

**Payment Initiation Request:**

```bash
curl -X POST https://api.kpay.rw/v1/payments \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Merchant-ID: YOUR_MERCHANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "phone": "256788823265",
    "reference": "INTAMBWE-1704067200000-abc123",
    "narration": "Premium donation to Intambwe Media",
    "currency": "RWF",
    "callbackUrl": "https://yourdomain.com/api/premium/webhook"
  }'
```

**Successful Response:**

```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "transactionId": "tx_123456",
  "amount": 500,
  "receiver": "Emmanuel Ndahayo"
}
```

## Receiver Details

```
Name: Emmanuel Ndahayo
Phone: 0788823265 (MTN)
Account Type: Mobile Money
Country: Rwanda (RW)
Currency: RWF
```

## Supported Networks

- **MTN Mobile Money** (0788, 0789)
- **Airtel Money** (0703, 0704, 0705, 0706)

## Phone Number Handling

The system automatically converts phone numbers:

| Input Format    | Normalized     | Valid?            |
| --------------- | -------------- | ----------------- |
| `0788823265`    | `256788823265` | ✅                |
| `+250788823265` | `256788823265` | ✅                |
| `250788823265`  | `256788823265` | ✅                |
| `0703000000`    | `256703000000` | ✅                |
| `0700000000`    | Rejected       | ❌ Not MTN/Airtel |

## Testing

### Before Going Live:

1. Verify KPay test mode is enabled in dashboard
2. Create test payment with test credentials
3. Use test amounts: 200, 500, 1000 RWF

### Test Payment Flow:

```bash
curl -X POST http://localhost:3000/api/premium/payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "phoneNumber": "0788823265",
    "language": "ky"
  }'
```

### Expected Response:

```json
{
  "success": true,
  "message": "Ayiswe umusaza w'icyuma",
  "transactionId": "INTAMBWE-1704067200000-abc123",
  "amount": 500,
  "receiver": "Emmanuel Ndahayo"
}
```

## Transaction Verification

The system automatically:

1. **Validates** phone numbers (MTN/Airtel only)
2. **Validates** amount (200 RWF minimum, no maximum)
3. **Initiates** payment via KPay API
4. **Generates** unique transaction references (INTAMBWE-{timestamp}-{random})
5. **Polls** payment status (automatic check after 30 seconds)
6. **Receives** webhook confirmations for verified payments
7. **Provides** transaction tracking and status updates

## Database Integration (Optional)

To store payment records, implement this schema:

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  kpay_transaction_id VARCHAR(100),
  phone_number VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'RWF',
  provider VARCHAR(20) DEFAULT 'kpay',
  status VARCHAR(20) DEFAULT 'pending',
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Then uncomment the database calls in `/api/premium/webhook/route.ts`:

```typescript
// TODO: Uncomment after database setup
// await db.payments.update(
//   { transactionId: paymentData.reference },
//   { status: 'verified', kpayId: paymentData.id }
// );
```

## Error Handling

The API returns errors in the user's selected language:

**English Error Response:**

```json
{
  "success": false,
  "message": "Invalid phone number. Please use MTN or Airtel."
}
```

**Kinyarwanda Error Response:**

```json
{
  "success": false,
  "message": "Numero y'ifoni ntabwire. Koresha MTN cyangwa Airtel."
}
```

### Common Errors:

| Error                 | Cause                     | Solution                                  |
| --------------------- | ------------------------- | ----------------------------------------- |
| Invalid phone number  | Wrong format or network   | Use MTN (0788/0789) or Airtel (0703-0706) |
| Amount too low        | Less than 200 RWF         | Enter 200 RWF or more                     |
| API connection failed | KPay service down         | Try again in few minutes                  |
| Invalid credentials   | Wrong API key/Merchant ID | Verify credentials in `.env.local`        |

## Security Considerations

1. **API Keys**: Never commit `.env.local` to version control
2. **HTTPS Only**: All payment requests use HTTPS
3. **Webhook Verification**: Verify webhook signatures using KPAY_WEBHOOK_SECRET
4. **Phone Validation**: Sanitize and validate phone numbers before API call
5. **Rate Limiting**: Implement rate limiting on payment endpoint (recommended: 5 requests per minute per IP)
6. **Transaction IDs**: Use unique, timestamped references (INTAMBWE-{timestamp}-{random})

### Webhook Security Example:

```typescript
// Verify KPay webhook signature
const hash = crypto
  .createHmac("sha256", KPAY_WEBHOOK_SECRET)
  .update(body)
  .digest("hex");

if (hash !== request.headers.get("x-kpay-signature")) {
  return NextResponse.json({ status: "error" }, { status: 401 });
}
```

## Troubleshooting

### Payment Not Processing

**Check:**

- Verify KPay API key and Merchant ID are correct in `.env.local`
- Confirm KPay account is active and not suspended
- Ensure phone number is correct (try different network)
- Check if KPay API is up: https://status.kpay.rw/ (if available)

**Solution:**

- Add logging to `/api/premium/payment/route.ts`
- Test with different MTN/Airtel numbers
- Contact KPay support: support@kpay.rw

### Webhook Not Received

**Check:**

- Verify webhook URL is publicly accessible
- Confirm HTTPS is enabled
- Check webhook logs in KPay dashboard

**Solution:**

- Test webhook manually from KPay dashboard
- Verify webhook path: `/api/premium/webhook`
- Check server logs for POST requests to webhook endpoint
- Ensure firewall allows KPay IP addresses

### Transaction Verification Failed

**Check:**

- Wait 30-60 seconds (automatic verification happens after 30s)
- Verify transaction ID format: `INTAMBWE-{timestamp}-{random}`
- Check transaction status in KPay dashboard

**Solution:**

- Manually check: `GET /api/premium/verify?tx_ref=INTAMBWE-xxx`
- Review KPay dashboard for transaction details
- Check payment logs in system

### Phone Validation Issues

**Issue:** "Numero y'ifoni ntabwire" (Invalid phone number)

**Solution:**

- Confirm it's an MTN (0788/0789) or Airtel (0703-0706) number
- Try removing spaces: 0788 823 265 → 0788823265
- Verify with KPay that number is actually active

## KPay Rwanda Resources

- **Website**: https://kpay.rw/
- **Dashboard**: https://dashboard.kpay.rw/
- **API Documentation**: https://docs.kpay.rw/
- **Support Email**: support@kpay.rw
- **Support Hours**: 9 AM - 5 PM (Rwanda Time, Mon-Fri)

## Intambwe Media Setup Checklist

- [ ] Created KPay Rwanda account
- [ ] Obtained API Key and Merchant ID
- [ ] Added credentials to `.env.local`
- [ ] Registered webhook URL in KPay dashboard
- [ ] Tested payment flow with 200 RWF test amount
- [ ] Verified webhook delivery in KPay dashboard
- [ ] Confirmed payments show in Emmanuel Ndahayo's account
- [ ] Set up payment records database (optional)
- [ ] Deployed to production
- [ ] Monitored first few transactions for issues

## Support

For KPay Rwanda issues:

- Email: support@kpay.rw
- Dashboard: https://dashboard.kpay.rw/
- Documentation: https://docs.kpay.rw/

For Intambwe Media issues:

- Contact system administrator
- Check deployment logs
- Review webhook verification in KPay dashboard
