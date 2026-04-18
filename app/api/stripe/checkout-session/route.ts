import { NextRequest, NextResponse } from 'next/server';

const Stripe = require('stripe');

export async function POST(request: NextRequest) {
  try {
    const { priceId, successUrl, cancelUrl } = await request.json();

    if (!priceId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters: priceId, successUrl, cancelUrl' },
        { status: 400 }
      );
    }

    const stripeApiKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeApiKey) {
      return NextResponse.json(
        { error: 'Stripe API key not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeApiKey);

    const session = await stripe.checkout.sessions.create({
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
