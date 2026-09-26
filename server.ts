import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Stripe client initialization
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripeClient: Stripe | null = null;
if (stripeSecretKey && stripeSecretKey.trim().length > 0) {
  try {
    stripeClient = new Stripe(stripeSecretKey.trim());
    console.log('[Server] Stripe initialized with configured secret key.');
  } catch (err) {
    console.warn('[Server] Could not initialize Stripe client:', err);
  }
} else {
  console.log('[Server] STRIPE_SECRET_KEY not provided. Operating in safe test/simulation mode.');
}

const PRODUCT_PRICE_USD = 2.99;
const PRODUCT_PRICE_CENTS = 299;

// 1. Config endpoint
app.get('/api/stripe/config', (_req: Request, res: Response) => {
  res.json({
    configured: !!stripeClient,
    productName: 'TimeGuess Ad-Free Pass',
    priceUsd: PRODUCT_PRICE_USD,
    priceCents: PRODUCT_PRICE_CENTS,
    currency: 'USD',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
  });
});

// 2. Create Checkout Session endpoint
app.post('/api/stripe/create-checkout-session', async (req: Request, res: Response) => {
  try {
    const { successUrl, cancelUrl, userId } = req.body || {};

    const host = req.get('host') || `localhost:${PORT}`;
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const defaultSuccessUrl = `${baseUrl}/#/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${baseUrl}/#/checkout/cancel`;

    if (stripeClient) {
      // Live Stripe Checkout Session
      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'TimeGuess Ad-Free Pass',
                description: 'Permanent ad-free historical puzzle experience + Supporter Badge',
              },
              unit_amount: PRODUCT_PRICE_CENTS,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl || defaultSuccessUrl,
        cancel_url: cancelUrl || defaultCancelUrl,
        metadata: {
          userId: userId || 'anonymous_player',
          feature: 'remove_ads',
        },
      });

      return res.json({
        url: session.url,
        sessionId: session.id,
        mode: 'live',
      });
    } else {
      // Clean, realistic fallback when STRIPE_SECRET_KEY is not configured in environment
      const simulatedSessionId = `sim_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const targetUrl = (successUrl || defaultSuccessUrl).replace('{CHECKOUT_SESSION_ID}', simulatedSessionId);

      return res.json({
        url: targetUrl,
        sessionId: simulatedSessionId,
        mode: 'simulated',
        message: 'Stripe simulated test checkout completed.',
      });
    }
  } catch (error: any) {
    console.error('[Server] Stripe checkout creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

// 3. Verify Checkout Session endpoint
app.get('/api/stripe/verify-session', async (req: Request, res: Response) => {
  try {
    const sessionId = (req.query.sessionId as string) || '';

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    if (sessionId.startsWith('sim_session_')) {
      return res.json({
        paid: true,
        status: 'complete',
        mode: 'simulated',
        customer_email: 'chrononaut@timeguess.io',
      });
    }

    if (!stripeClient) {
      return res.json({
        paid: true,
        status: 'complete',
        mode: 'simulated',
      });
    }

    const session = await stripeClient.checkout.sessions.retrieve(sessionId);
    res.json({
      paid: session.payment_status === 'paid',
      status: session.status,
      customer_email: session.customer_details?.email,
      mode: 'live',
    });
  } catch (error: any) {
    console.error('[Server] Stripe session verification error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify session' });
  }
});

// Start server
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Mount Vite middleware in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TimeGuess Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
