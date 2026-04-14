# Flutterwave Payment Integration Setup

This guide explains how to set up the Flutterwave payment integration for Intambwe Media's Premium/Ifatabuguzi feature.

## Overview

The payment system integrates with **Flutterwave Rwanda** to accept mobile money payments from MTN and Airtel networks. Payments are sent directly to **Emmanuel Ndahayo** at `0788823265`.

## Environment Variables

Add the following variables to your `.env.local` file:

```env
# Flutterwave Configuration
FLUTTERWAVE_PUBLIC_KEY=your_flutterwave_public_key
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key
```

## Getting Your Flutterwave Credentials

1. **Sign Up**: Go to [https://flutterwave.com/rw/](https://flutterwave.com/rw/)
2. **Create Account**: Register your business/media outlet
3. **Verify Email**: Confirm your email address
4. **Complete KYC**: Provide business verification details
5. **Get API Keys**: 
   - Navigate to **Settings** → **API**
   - Copy your **Public Key** and **Secret Key**

## Webhook Configuration

After getting your API keys:

1. Go to **Settings** → **Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/premium/webhook`
3. Select events: `charge.completed`
4. Save webhook

## Payment Flow

### User Flow:
1. User visits `/premium` page
2. Selects amount (200-2000 RWF)
3. Enters RWandan phone number (MTN/Airtel)
4. Clicks "Rema icyuma" (Pay Now)
5. API initiates Flutterwave payment
6. User receives USSD prompt on phone
7. User confirms payment via USSD
8. Payment webhook received
9. Payment status updated

### API Endpoints:

- **POST /api/premium/payment** - Initiate payment
  ```json
  {
    "amount": 500,
    "phoneNumber": "0788823265",
    "language": "ky"
  }
  ```

- **GET /api/premium/verify?tx_ref=TX-ID** - Check payment status

- **POST /api/premium/webhook** - Flutterwave webhook callback

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

## Testing

### Test Credentials (Sandbox Mode)

If you want to test before going live:

1. Use Flutterwave's test API keys
2. Test phone numbers:
   - MTN: `+250788000000`
   - Airtel: `+250703000000`

### Test Payment Flow:

```bash
curl -X POST http://localhost:3000/api/premium/payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "phoneNumber": "0788000000",
    "language": "ky"
  }'
```

## Transaction Verification

The system automatically:

1. **Validates** phone numbers (MTN/Airtel only)
2. **Verifies** transaction with Flutterwave API
3. **Stores** payment records (with database integration)
4. **Sends** webhook confirmations
5. **Provides** transaction references

## Database Integration (Optional)

To store payment records, implement database schema:

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  flutterwave_id VARCHAR(100),
  phone_number VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'RWF',
  provider VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Error Handling

The API returns errors in this format:

```json
{
  "success": false,
  "message": "Error message in user's language"
}
```

Common errors:
- Invalid phone number format
- Unsupported network (not MTN/Airtel)
- Amount out of range (< 200 or > 2000 RWF)
- API connection issues

## Security Considerations

1. **API Keys**: Never commit keys to version control
2. **HTTPS Only**: All payment requests use HTTPS
3. **Webhook Verification**: Verify webhook signatures
4. **Rate Limiting**: Implement rate limiting on payment endpoint
5. **Phone Validation**: Sanitize and validate phone numbers

## Troubleshooting

### Payment Not Processing

- Verify Flutterwave API keys are correct
- Check network status (MTN/Airtel)
- Ensure phone number format is correct (+250 format)

### Webhook Not Received

- Verify webhook URL is publicly accessible
- Check Flutterwave webhook logs
- Ensure HTTPS is enabled

### Transaction Verification Failed

- Give payment 30-60 seconds to process
- Check transaction ID is correct
- Verify with Flutterwave dashboard

## Support

For Flutterwave issues:
- Email: support@flutterwave.com
- Portal: https://flutterwave.com/rw/
- Documentation: https://developer.flutterwave.com/

For Intambwe Media issues:
- Contact system administrator
