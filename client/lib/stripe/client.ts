import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY manquante dans les variables d\'environnement');
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2026-03-25.dahlia',
  });

  return stripeInstance;
}
