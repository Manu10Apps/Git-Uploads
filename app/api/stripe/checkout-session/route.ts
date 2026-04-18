import { NextRequest, NextResponse } from 'next/server';

const stripe = require('stripe');

const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request: NextRequest) {
  try {
    const { priceId, successUrl, cancelUrl } = await request.json();

    if (!priceId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters: priceId, successUrl, cancelUrl' },
        { status: 400 }
      );
    }

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription', // Use 'subscription' for recurring or 'payment' for one-time
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'auto',
      customer_creation: 'always', // Create customer for recurring billing
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
