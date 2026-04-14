import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const ESICIA_API_KEY = process.env.ESICIA_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.text();

    if (!body) {
      console.warn('Empty webhook body');
      return NextResponse.json({ status: 'error', message: 'No data' }, { status: 400 });
    }

    const data = JSON.parse(body);

    // Handle ESICIA payment webhook
    // ESICIA sends payment status notifications with transaction details
    if (data.refid && (data.status === 'successful' || data.status === 'success')) {
      const paymentData = data;

      console.log(`✓ Payment Webhook Verified (ESICIA):
        Reference: ${paymentData.refid}
        Amount: ${paymentData.amount} ${paymentData.currency || 'RWF'}
        Phone: ${paymentData.msisdn}
        Status: ${paymentData.status}`);

      // TODO: Update payment status in database
      // await db.payments.update(
      //   { transactionId: paymentData.refid },
      //   { status: 'verified', esiciaId: paymentData.id }
      // );

      return NextResponse.json({ status: 'success', message: 'Payment verified' });
    }

    // Handle failed or pending payments
    if (data.refid) {
      console.log(`Payment Status Update (ESICIA):
        Reference: ${data.refid}
        Status: ${data.status}
        Message: ${data.reply || data.message || 'No message'}`);

      return NextResponse.json({ status: 'success', message: 'Webhook processed' });
    }

    return NextResponse.json({ status: 'success', message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 'error', message: 'Webhook processing failed' }, { status: 500 });
  }
}
