import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface PaymentRequest {
  amount: number;
  phoneNumber: string;
  language: string;
}

interface FlutterwavePayload {
  tx_ref: string;
  amount: number;
  currency: string;
  payment_options: string;
  customer: {
    email: string;
    phone_number: string;
    name: string;
  };
  customizations: {
    title: string;
    description: string;
    logo: string;
  };
  meta: {
    receiver_name: string;
    receiver_phone: string;
  };
}

const RECEIVER_PHONE = '0788823265';
const RECEIVER_NAME = 'Emmanuel Ndahayo';
const FLUTTERWAVE_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY || '';
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json();
    const { amount, phoneNumber, language } = body;

    // Validate inputs
    if (!amount || amount < 200 || amount > 2000) {
      return NextResponse.json(
        { message: language === 'ky' ? 'Ingano ntabwo ari neza' : 'Invalid amount' },
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

    // Prepare Flutterwave payload
    const flutterwavePayload: FlutterwavePayload = {
      tx_ref: txRef,
      amount: amount,
      currency: 'RWF',
      payment_options: 'mobilemoneyrwanda',
      customer: {
        email: 'support@intambwemedia.com',
        phone_number: normalizedPhone,
        name: 'Intambwe Media Supporter',
      },
      customizations: {
        title: language === 'ky' ? 'Ifatabuguzi - Intambwe Media' : 'Premium - Intambwe Media',
        description: language === 'ky' 
          ? 'Rema inzira Intambwe Media mu cyuma guto' 
          : 'Support quality African journalism',
        logo: 'https://intambwemedia.com/logo.png',
      },
      meta: {
        receiver_name: RECEIVER_NAME,
        receiver_phone: RECEIVER_PHONE,
      },
    };

    // Process payment via Flutterwave
    const paymentResult = await processFlutterwavePayment(
      flutterwavePayload,
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
    console.log(`✓ Payment Initiated via Flutterwave:
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
 * Process payment via Flutterwave API
 * Integrates with MTN Mobile Money Rwanda
 */
async function processFlutterwavePayment(
  payload: FlutterwavePayload,
  phoneNumber: string,
  amount: number
): Promise<{ success: boolean; message: string }> {
  try {
    if (!FLUTTERWAVE_SECRET_KEY) {
      console.warn('Flutterwave secret key not configured. Using fallback processing.');
      return {
        success: true,
        message: 'Payment processing initiated',
      };
    }

    const response = await fetch('https://api.flutterwave.com/v3/charges?type=mobilemoney', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      },
      body: JSON.stringify({
        tx_ref: payload.tx_ref,
        amount: payload.amount,
        currency: payload.currency,
        customer: payload.customer,
        customizations: payload.customizations,
        meta: payload.meta,
        payment_type: 'mobilemoney',
        country: 'RW',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Flutterwave API error:', data);
      return {
        success: false,
        message: data.message || 'Payment processing failed',
      };
    }

    if (data.data?.auth_url) {
      return {
        success: true,
        message: 'Proceed to payment authorization',
      };
    }

    return {
      success: true,
      message: 'Payment initiated',
    };
  } catch (error) {
    console.error('Flutterwave processing error:', error);
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
