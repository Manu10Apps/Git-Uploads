import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'usd', successUrl, cancelUrl } = await request.json();

    // Validate inputs
    if (!amount || typeof amount !== 'number' || amount < 100) {
      return NextResponse.json(
        { error: 'Invalid amount. Minimum is $1.00 (100 cents).' },
        { status: 400 }
      );
    }

    if (!successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters: successUrl, cancelUrl' },
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

    // Lazy-load Stripe inside the handler to avoid module-level env variable issues
    const Stripe = require('stripe');
    const stripe = new Stripe(stripeApiKey);

    // Create checkout session with dynamic pricing
    // Note: RWF is a non-decimal currency, so unit_amount should be in base units (not cents)
    // USD: amount is in cents (100 = $1.00)
    // RWF: amount is in base units (5000 = FRw 5,000)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: 'Ifatabuguzi Premium Subscription',
              description: 'Access premium content and features',
            },
            unit_amount: amount, // USD: cents | RWF: base units
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // Use 'payment' for one-time payment
      success_url: successUrl,
      cancel_url: cancelUrl,
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
