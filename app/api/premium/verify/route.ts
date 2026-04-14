import { NextRequest, NextResponse } from 'next/server';

const KPAY_API_KEY = process.env.KPAY_API_KEY || '';
const KPAY_API_URL = process.env.KPAY_API_URL || 'https://api.kpay.rw';
const KPAY_MERCHANT_ID = process.env.KPAY_MERCHANT_ID || '';

export async function GET(request: NextRequest) {
  try {
    const transactionId = request.nextUrl.searchParams.get('tx_ref');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    if (!KPAY_API_KEY || !KPAY_MERCHANT_ID) {
      // Return mock response if no API key configured
      return NextResponse.json({
        status: 'pending',
        message: 'Payment verification pending. This may take a few moments.',
        transactionId,
      });
    }

    // Verify payment with KPay
    const response = await fetch(
      `${KPAY_API_URL}/v1/payments/${transactionId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${KPAY_API_KEY}`,
          'X-Merchant-ID': KPAY_MERCHANT_ID,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('KPay verification error:', data);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Could not verify payment. Please contact support.',
        },
        { status: 400 }
      );
    }

    const paymentData = data.data || data;

    return NextResponse.json({
      status: paymentData.status || 'pending',
      transactionId: paymentData.reference || transactionId,
      amount: paymentData.amount,
      currency: paymentData.currency || 'RWF',
      customer: {
        phone: paymentData.phone,
      },
      message:
        paymentData.status === 'success' || paymentData.status === 'completed'
          ? 'Payment confirmed! Thank you for supporting Intambwe Media.'
          : paymentData.status === 'pending'
            ? 'Payment is being processed. Please wait...'
            : 'Payment verification failed. Please try again.',
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}
