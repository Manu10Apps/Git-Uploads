import { NextRequest, NextResponse } from 'next/server';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const transactionId = request.nextUrl.searchParams.get('tx_ref');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    if (!FLUTTERWAVE_SECRET_KEY) {
      // Return mock response if no API key configured
      return NextResponse.json({
        status: 'pending',
        message: 'Payment verification pending. This may take a few moments.',
        transactionId,
      });
    }

    // Verify payment with Flutterwave
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?reference=${transactionId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Flutterwave verification error:', data);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Could not verify payment. Please contact support.',
        },
        { status: 400 }
      );
    }

    const paymentData = data.data;

    return NextResponse.json({
      status: paymentData.status || 'pending',
      transactionId: paymentData.tx_ref,
      amount: paymentData.amount,
      currency: paymentData.currency,
      customer: {
        phone: paymentData.customer?.phone_number,
        name: paymentData.customer?.name,
      },
      message:
        paymentData.status === 'successful'
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
