import { NextRequest, NextResponse } from 'next/server';

interface PaymentRequest {
  amount: number;
  phoneNumber: string;
  language: string;
  email?: string;
}

interface ESICIAPayload {
  action: string;
  msisdn: string;
  email: string;
  details: string;
  refid: string;
  amount: number;
  currency: string;
  cname: string;
  cnumber: string;
  pmethod: string;
  retailerid: string;
  returl: string;
  redirecturl: string;
}

const RECEIVER_EMAIL = 'admin@intambwemedia.com';
const ESICIA_API_KEY = process.env.ESICIA_API_KEY || '';
const ESICIA_USERNAME = process.env.ESICIA_USERNAME || '';
const ESICIA_PASSWORD = process.env.ESICIA_PASSWORD || '';
const ESICIA_RETAILER_ID = process.env.ESICIA_RETAILER_ID || '';

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
        { message: language === 'ky' ? 'Shyiramo Nimero Nyayo' : 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Normalize phone number to MSISDN format (256XXXXXXXXX)
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

    // Prepare ESICIA payload
    const esiciaPayload: ESICIAPayload = {
      action: 'pay',
      msisdn: normalizedPhone,
      email: RECEIVER_EMAIL,
      details: language === 'ky' 
        ? 'Ifatabuguzi - Intambwe Media'
        : language === 'sw'
        ? 'Kuchangia - Intambwe Media'
        : 'Premium Support - Intambwe Media',
      refid: txRef,
      amount: amount,
      currency: 'RWF',
      cname: 'Intambwe Media',
      cnumber: txRef,
      pmethod: 'momo',
      retailerid: ESICIA_RETAILER_ID || 'INTAMBWE',
      returl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://intambwemedia.com'}/premium?tx_ref=${txRef}`,
      redirecturl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://intambwemedia.com'}/premium`,
    };

    // Process payment via ESICIA
    const paymentResult = await processESICIAPayment(
      esiciaPayload,
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
    console.log(`✓ Payment Initiated via ESICIA:
      TX Ref: ${txRef}
      Phone: ${normalizedPhone}
      Amount: ${amount} RWF
      Checkout URL: ${paymentResult.checkoutUrl}`);

    return NextResponse.json(
      {
        success: true,
        message:
          language === 'ky'
            ? `Ijambo ryobwigire: ${txRef}. Andika kuri USSD prompt.`
            : `Payment initiated. Reference: ${txRef}. Complete the USSD prompt.`,
        transactionId: txRef,
        amount,
        checkoutUrl: paymentResult.checkoutUrl,
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
 * Process payment via ESICIA API
 * ESICIA Rwanda mobile money integration
 */
async function processESICIAPayment(
  payload: ESICIAPayload,
  phoneNumber: string,
  amount: number
): Promise<{ success: boolean; message: string; checkoutUrl?: string }> {
  try {
    if (!ESICIA_API_KEY || !ESICIA_USERNAME || !ESICIA_PASSWORD) {
      console.warn('ESICIA credentials not configured.');
      return {
        success: false,
        message: 'Payment system not configured. Please try again later.',
      };
    }

    // Create Basic Auth header
    const auth = Buffer.from(`${ESICIA_USERNAME}:${ESICIA_PASSWORD}`).toString('base64');

    // Call ESICIA API
    const response = await fetch('https://pay.esicia.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Kpay-Key': ESICIA_API_KEY,
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('ESICIA API error:', data);
      return {
        success: false,
        message: data.reply || data.message || 'Payment processing failed',
      };
    }

    // ESICIA returns success with checkout URL
    if ((data.success === 1 || data.success === true) && data.url) {
      console.log('✓ ESICIA Payment Processing:', data);
      return {
        success: true,
        message: 'Payment initiated',
        checkoutUrl: data.url,
      };
    }

    // Handle partial success but with URL
    if (data.url) {
      return {
        success: true,
        message: 'Payment initiated',
        checkoutUrl: data.url,
      };
    }

    return {
      success: false,
      message: data.reply || 'Payment initiation failed',
    };
  } catch (error) {
    console.error('ESICIA processing error:', error);
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
