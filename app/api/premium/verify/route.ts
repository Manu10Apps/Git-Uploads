import { NextRequest, NextResponse } from 'next/server';

const ESICIA_API_KEY = process.env.ESICIA_API_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const transactionId = request.nextUrl.searchParams.get('tx_ref');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    if (!ESICIA_API_KEY) {
      // Return pending response if credentials not configured
      return NextResponse.json({
        status: 'pending',
        message: 'Payment verification pending. This may take a few moments.',
        transactionId,
      });
    }

    // Verify payment with ESICIA
    const paymentStatus = await verifyESICIAPayment(transactionId);

    return NextResponse.json({
      status: paymentStatus.status || 'pending',
      transactionId: paymentStatus.transactionId || transactionId,
      amount: paymentStatus.amount,
      currency: paymentStatus.currency || 'RWF',
      customer: {
        phone: paymentStatus.phone,
      },
      message:
        paymentStatus.status === 'success' || paymentStatus.status === 'completed'
          ? 'Payment confirmed! Thank you for supporting Intambwe Media.'
          : paymentStatus.status === 'pending'
            ? 'Payment is being processed. Please wait...'
            : 'Payment verification pending. Please check back soon.',
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}

/**
 * Verify payment status with ESICIA
 * ESICIA API returns status via query parameter
 */
async function verifyESICIAPayment(transactionId: string): Promise<{
  status: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  phone?: string;
}> {
  try {
    // Query ESICIA for payment status
    const response = await fetch(`https://pay.esicia.com/?refid=${transactionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'secret_key': ESICIA_API_KEY,
      },
    });

    const data = await response.json();

    console.log('ESICIA Verify Response:', {
      refid: data.refid,
      status: data.status,
      reply: data.reply,
    });

    if (!response.ok) {
      console.warn('ESICIA verification response:', data);
      return {
        status: 'pending',
      };
    }

    // Map ESICIA response to standard format
    // ESICIA returns "successful" or similar status strings
    const status = 
      data.status === 'successful' || 
      data.status === 'success' || 
      data.reply === 'CONFIRMED' 
        ? 'success' 
        : data.status || 'pending';

    return {
      status: status,
      transactionId: data.refid || transactionId,
      amount: data.amount,
      currency: data.currency || 'RWF',
      phone: data.msisdn,
    };
  } catch (error) {
    console.error('ESICIA verification error:', error);
    return {
      status: 'pending',
    };
  }
}
