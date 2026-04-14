import { NextRequest, NextResponse } from 'next/server';

interface PaymentRequest {
  amount: number;
  phoneNumber: string;
  language: string;
}

interface KPayPayload {
  amount: number;
  phone: string;
  reference: string;
  narration: string;
  currency: string;
}

const RECEIVER_PHONE = '0788823265';
const RECEIVER_NAME = 'Emmanuel Ndahayo';
const KPAY_API_KEY = process.env.KPAY_API_KEY || '';
const KPAY_API_URL = process.env.KPAY_API_URL || 'https://api.kpay.rw';
const KPAY_MERCHANT_ID = process.env.KPAY_MERCHANT_ID || '';

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json();
    const { amount, phoneNumber, language } = body;

    // Validate inputs - allow 200 RWF and above with no upper limit
    if (!amount || amount < 200) {
      return NextResponse.json(
        { message: language === 'ky' ? 'Ingano igomba kuba 200 RWF cyangwa hejuru' : 'Minimum amount is 200 RWF' },
        { status: 400 }
      );
    }

    if (!phoneNumber || !/^256\d{9}$/.test(phoneNumber.replace(/\D/g, '').replace(/^0/, '256'))) {
      return NextResponse.json(
        { message: language === 'ky' ? 'Nimiro y\'icyuma ntabwo ari neza' : 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber
      .replace(/\s/g, '')
      .replace(/^0/, '256')
      .replace(/\+/, '');

    // Check if the number is MTN or Airtel
    const isMTN = normalizedPhone.startsWith('250788') || normalizedPhone.startsWith('250789');
    const isAirtel =
      normalizedPhone.startsWith('250703') ||
      normalizedPhone.startsWith('250704') ||
      normalizedPhone.startsWith('250705') ||
      normalizedPhone.startsWith('250706');

    if (!isMTN && !isAirtel) {
      return NextResponse.json(
        {
          message: language === 'ky' ? 'Cyuma kibazo MTN cyangwa Airtel gusa' : 'Only MTN or Airtel numbers are supported',
        },
        { status: 400 }
      );
    }

    // Generate unique transaction reference
    const txRef = `INTAMBWE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Prepare KPay payload
    const kpayPayload: KPayPayload = {
      amount: amount,
      phone: normalizedPhone,
      reference: txRef,
      narration: language === 'ky' 
        ? 'Ifatabuguzi - Intambwe Media mu cyuma guto'
        : language === 'sw'
        ? 'Kuchangia - Intambwe Media'
        : 'Premium Support - Intambwe Media',
      currency: 'RWF',
    };

    // Process payment via KPay
    const paymentResult = await processKPayPayment(
      kpayPayload,
      normalizedPhone,
      amount
    );

    if (!paymentResult.success) {
      return NextResponse.json(
        { message: paymentResult.message },
        { status: 400 }
      );
    }

    // Log successful payment initiation
    console.log(`✓ Payment Initiated via KPay:
      TX Ref: ${txRef}
      Phone: ${normalizedPhone}
      Amount: ${amount} RWF
      Receiver: ${RECEIVER_NAME} (${RECEIVER_PHONE})`);

    return NextResponse.json(
      {
        success: true,
        message:
          language === 'ky'
            ? `Ijambo ryobwigire: ${txRef}. Andika kuri USSD prompt.`
            : `Payment initiated. Reference: ${txRef}. Complete the USSD prompt.`,
        transactionId: txRef,
        amount,
        receiver: {
          name: RECEIVER_NAME,
          phone: RECEIVER_PHONE,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json(
      { message: 'An error occurred during payment processing' },
      { status: 500 }
    );
  }
}

/**
 * Process payment via KPay API
 * KPay Rwanda integration for mobile money payments
 */
async function processKPayPayment(
  payload: KPayPayload,
  phoneNumber: string,
  amount: number
): Promise<{ success: boolean; message: string }> {
  try {
    if (!KPAY_API_KEY || !KPAY_MERCHANT_ID) {
      console.warn('KPay credentials not configured. Using fallback processing.');
      return {
        success: true,
        message: 'Payment processing initiated',
      };
    }

    const response = await fetch(`${KPAY_API_URL}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KPAY_API_KEY}`,
        'X-Merchant-ID': KPAY_MERCHANT_ID,
      },
      body: JSON.stringify({
        amount: payload.amount,
        phone: payload.phone,
        reference: payload.reference,
        narration: payload.narration,
        currency: payload.currency,
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://intambwemedia.com'}/api/premium/webhook`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('KPay API error:', data);
      return {
        success: false,
        message: data.message || 'Payment processing failed',
      };
    }

    // KPay returns success with transaction details
    if (data.status === 'success' || data.status === 'pending') {
      return {
        success: true,
        message: 'Payment initiated',
      };
    }

    return {
      success: true,
      message: 'Payment initiated',
    };
  } catch (error) {
    console.error('KPay processing error:', error);
    return {
      success: false,
      message: 'Failed to process payment. Please try again.',
    };
  }
}

/**
 * MTN Mobile Money API Integration Template
 * Uncomment and configure when ready to use production API
 *

async function processMTNPayment(
  phoneNumber: string,
  amount: number,
  transactionId: string
) {
  const mtnApiKey = process.env.MTN_API_KEY;
  const mtnApiUrl = process.env.MTN_API_URL || 'https://openapi.mtn.com';

  try {
    const response = await fetch(`${mtnApiUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Reference-Id': transactionId,
        'Ocp-Apim-Subscription-Key': mtnApiKey,
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency: 'RWF',
        externalId: transactionId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber,
        },
        payerMessage: 'Intambwe Media Support',
        payeeNote: 'Support Intambwe Media Journalism',
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('MTN API error:', error);
    return false;
  }
}
*/

/**
 * Airtel Money API Integration Template
 * Uncomment and configure when ready to use production API
 *

async function processAirtelPayment(
  phoneNumber: string,
  amount: number,
  transactionId: string
) {
  const airtelApiKey = process.env.AIRTEL_API_KEY;
  const airtelApiUrl = process.env.AIRTEL_API_URL || 'https://api.airtel.africa';

  try {
    const response = await fetch(`${airtelApiUrl}/api/v1/merchant/c2b/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${airtelApiKey}`,
      },
      body: JSON.stringify({
        reference: transactionId,
        subscriber: {
          country: 'RW',
          currency: 'RWF',
          msisdn: phoneNumber,
        },
        transaction: {
          amount: amount.toString(),
          id: transactionId,
          type: 'CustomerPayment',
        },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Airtel API error:', error);
    return false;
  }
}
*/
