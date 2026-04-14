import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const KPAY_WEBHOOK_SECRET = process.env.KPAY_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    // Get webhook signature from headers
    const signature = request.headers.get('x-kpay-signature');
    const body = await request.text();

    if (!signature && KPAY_WEBHOOK_SECRET) {
      console.warn('No webhook signature found');
      return NextResponse.json({ status: 'error', message: 'No signature' }, { status: 401 });
    }

    // Verify KPay webhook signature (if secret is configured)
    if (KPAY_WEBHOOK_SECRET) {
      const hash = crypto
        .createHmac('sha256', KPAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      if (hash !== signature) {
        console.warn('Invalid webhook signature');
        return NextResponse.json({ status: 'error', message: 'Invalid signature' }, { status: 401 });
      }
    }

    const data = JSON.parse(body);

    // Handle KPay payment webhook
    if (data.event === 'payment.completed' || data.type === 'payment.success') {
      const paymentData = data.data || data;

      if (paymentData.status === 'success' || paymentData.status === 'completed') {
        console.log(`✓ Payment Webhook Verified (KPay):
          Reference: ${paymentData.reference}
          Amount: ${paymentData.amount} ${paymentData.currency || 'RWF'}
          Phone: ${paymentData.phone}
          Status: ${paymentData.status}`);

        // TODO: Update payment status in database
        // await db.payments.update(
        //   { transactionId: paymentData.reference },
        //   { status: 'verified', kpayId: paymentData.id }
        // );

        return NextResponse.json({ status: 'success', message: 'Payment verified' });
      }
    }

    return NextResponse.json({ status: 'success', message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 'error', message: 'Webhook processing failed' }, { status: 500 });
  }
}
