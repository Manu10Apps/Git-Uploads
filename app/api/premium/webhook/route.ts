import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || '';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('verificationhash');
    const body = await request.text();

    if (!signature) {
      return NextResponse.json({ status: 'error', message: 'No signature' }, { status: 401 });
    }

    // Verify Flutterwave webhook signature
    const hash = crypto.createHmac('sha256', FLUTTERWAVE_SECRET_KEY).update(body).digest('hex');

    if (hash !== signature) {
      console.warn('Invalid webhook signature');
      return NextResponse.json({ status: 'error', message: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(body);

    // Handle payment webhook
    if (data.event === 'charge.completed') {
      const { data: chargeData } = data;

      if (chargeData.status === 'successful') {
        console.log(`✓ Payment Webhook Verified:
          TX Ref: ${chargeData.tx_ref}
          Amount: ${chargeData.amount} ${chargeData.currency}
          Phone: ${chargeData.customer.phone_number}
          Status: ${chargeData.status}`);

        // TODO: Update payment status in database
        // await db.payments.update(
        //   { transactionId: chargeData.tx_ref },
        //   { status: 'verified', flutterwaveId: chargeData.id }
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
