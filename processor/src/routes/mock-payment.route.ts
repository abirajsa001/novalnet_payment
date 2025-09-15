// server/processor/payment-routes.ts
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import crypto from 'crypto';
import { createApiBuilderFromCtpClient, ClientBuilder } from '@commercetools/platform-sdk';
import { SessionHeaderAuthenticationHook } from '@commercetools/connect-payments-sdk';
import { getCartIdFromContext } from '../libs/fastify/context/context';

import {
  PaymentRequestSchema,
  PaymentRequestSchemaDTO,
  PaymentResponseSchema,
  PaymentResponseSchemaDTO,
} from '../dtos/mock-payment.dto';

type PaymentRoutesOptions = {
  sessionHeaderAuthHook: SessionHeaderAuthenticationHook;
};

/** Build a commercetools client from env credentials */
function ctClient() {
  const builder = new ClientBuilder()
    .withProjectKey(process.env.CT_PROJECT_KEY!)
    .withClientCredentialsFlow({
      clientId: process.env.CT_CLIENT_ID!,
      clientSecret: process.env.CT_CLIENT_SECRET!,
    })
    .withHttpMiddleware()
    .withLoggerMiddleware();
  return createApiBuilderFromCtpClient(builder.build());
}

export const paymentRoutes = async (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions & PaymentRoutesOptions
) => {
  const apiRoot = ctClient();

  // Quick health/test endpoint
  fastify.post('/test', async (_req, _reply) => ({ ok: true }));

  /**
   * POST /payments
   * - Creates a CT Payment, attaches it to the cart and returns the Novalnet redirect URL + paymentId
   * - Requires session auth so getCartIdFromContext() works
   */
  fastify.post<{ Body: PaymentRequestSchemaDTO; Reply: PaymentResponseSchemaDTO }>(
    '/payments',
    {
      preHandler: [opts.sessionHeaderAuthHook.authenticate()],
      schema: {
        body: PaymentRequestSchema,
        response: { 200: PaymentResponseSchema },
      },
    },
    async (request, reply) => {
      try {
        // 1) Determine cart id from session context (set by session auth hook)
        const cartId = getCartIdFromContext();
        if (!cartId) return reply.code(400).send({ paymentReference: 'cartId_missing' });

        // 2) Fetch cart to compute amounts & version
        const cartResp = await apiRoot.carts().withId({ ID: cartId }).get().execute();
        const cart = cartResp.body;
        const centAmount =
          (cart?.totalPrice?.centAmount ??
            cart?.taxedPrice?.totalGross?.centAmount ??
            0) as number;
        const currency =
          (cart?.totalPrice?.currencyCode ??
            cart?.taxedPrice?.totalGross?.currencyCode ??
            'EUR') as string;

        // 3) Create CT Payment (initial, pending)
        const paymentDraft: any = {
          amountPlanned: {
            currencyCode: currency,
            centAmount,
          },
          paymentMethodInfo: {
            paymentInterface: 'Novalnet',
            method: String(request.body?.paymentMethod?.type ?? 'IDEAL'),
          },
          paymentStatus: {
            interfaceCode: 'Pending',
            interfaceText: 'Redirect to Novalnet',
          },
          // attach customer or anonymousId if present in cart
          ...(cart.customerId ? { customer: { typeId: 'customer', id: cart.customerId } } : {}),
          ...(!cart.customerId && cart.anonymousId ? { anonymousId: cart.anonymousId } : {}),
        };

        const paymentResp = await apiRoot.payments().post({ body: paymentDraft }).execute();

        // 4) Attach payment to cart (use latest cart version)
        await apiRoot
          .carts()
          .withId({ ID: cartId })
          .post({
            body: {
              version: cart.version,
              actions: [{ action: 'addPayment', payment: { id: paymentResp.body.id } }],
            },
          })
          .execute();

        // 5) Build Novalnet payload (set return_url to include cartId & paymentId)
        const processorBase = process.env.PROCESSOR_BASE_URL ?? `${request.protocol}://${request.hostname}`;
        const returnUrl = `${processorBase}/success?cartId=${encodeURIComponent(
          cartId
        )}&paymentId=${encodeURIComponent(paymentResp.body.id)}`;
        const errorReturnUrl = `${processorBase}/failure?cartId=${encodeURIComponent(cartId)}`;

        const novalnetPayload = {
          merchant: {
            signature: String(process.env.NOVALNET_MERCHANT_SIGNATURE ?? ''),
            tariff: String(process.env.NOVALNET_TARIFF ?? ''),
          },
          customer: {
            first_name: 'Shopper',
            last_name: 'Customer',
            email: 'customer@example.com',
          },
          transaction: {
            test_mode: '1',
            payment_type: 'IDEAL', // adapt as needed
            amount: String(centAmount),
            currency,
            return_url: returnUrl,
            error_return_url: errorReturnUrl,
          },
          custom: {
            input1: 'cartId',
            inputval1: String(cartId),
            input2: 'paymentId',
            inputval2: String(paymentResp.body.id),
          },
        };

        // 6) Call Novalnet (server side)
        const novalnetRes = await fetch('https://payport.novalnet.de/v2/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-NN-Access-Key': process.env.NOVALNET_ACCESS_KEY ?? '',
          },
          body: JSON.stringify(novalnetPayload),
        });

        const novalnetJson = await novalnetRes.json();
        const redirectUrl = novalnetJson?.result?.redirect_url ?? null;
        if (!redirectUrl) {
          request.log.error({ novalnetJson }, 'Novalnet did not return redirect_url');
          // fallback: return payment id (no redirect)
          return reply.status(200).send({ paymentReference: paymentResp.body.id });
        }

        // 7) Return redirect URL + created CT payment id to frontend
        return reply.status(200).send({
          paymentReference: redirectUrl, // keep backwards compatibility: original code expects paymentReference
          redirectUrl,
          paymentId: paymentResp.body.id,
        });
      } catch (err: any) {
        request.log.error(err, 'POST /payments failed');
        return reply.status(500).send({ paymentReference: 'error' });
      }
    }
  );

  /**
   * GET /payments/status?paymentId=...
   * - used by frontend to poll until the payment has a successful transaction
   */
  fastify.get('/payments/status', { preHandler: [opts.sessionHeaderAuthHook.authenticate()] }, async (request, reply) => {
    try {
      const q = request.query as { paymentId?: string };
      if (!q?.paymentId) return reply.code(400).send({ status: 'missing_paymentId' });

      const paymentResp = await apiRoot.payments().withId({ ID: q.paymentId }).get().execute();
      const payment = paymentResp.body;
      const txs = payment.transactions ?? [];
      const hasSuccess = txs.some((t: any) => String(t.state).toLowerCase() === 'success');

      return reply.code(200).send({ status: hasSuccess ? 'Success' : 'Pending', paymentId: q.paymentId });
    } catch (err: any) {
      request.log.error(err, 'GET /payments/status failed');
      return reply.code(500).send({ status: 'error' });
    }
  });

  /**
   * GET /success
   * - Novalnet will redirect here after the shopper completes payment
   * - This handler validates checksum, updates the CT payment (adds transaction) and redirects to storefront
   */
  fastify.get('/success', async (request, reply) => {
    const query = request.query as {
      tid?: string;
      status?: string;
      checksum?: string;
      txn_secret?: string;
      cartId?: string;
      paymentId?: string;
    };

    if (!query.tid || !query.status || !query.checksum || !query.txn_secret || !query.cartId || !query.paymentId) {
      return reply.code(400).send('Missing required query parameters.');
    }

    const accessKey = process.env.NOVALNET_ACCESS_KEY ?? '';
    const tokenString = `${query.tid}${query.txn_secret}${query.status}${accessKey}`;
    const generatedChecksum = crypto.createHash('sha256').update(tokenString).digest('hex');

    if (generatedChecksum !== query.checksum) {
      request.log.warn({ generatedChecksum, provided: query.checksum }, 'Checksum mismatch');
      return reply.code(400).send('Checksum verification failed.');
    }

    try {
      // 1) Get the CT payment, use it to compute amount and current version
      const paymentGet = await apiRoot.payments().withId({ ID: query.paymentId }).get().execute();
      const payment = paymentGet.body;

      // 2) Add a successful transaction to the payment
      const addTxAction = {
        action: 'addTransaction',
        transaction: {
          type: 'Authorization',
          state: 'Success',
          amount: payment.amountPlanned,
          interactionId: query.tid,
        },
      };

      await apiRoot
        .payments()
        .withId({ ID: query.paymentId })
        .post({
          body: {
            version: payment.version,
            actions: [addTxAction],
          },
        })
        .execute();

      // 3) Redirect the shopper back to storefront's thank you page with paymentId
      const storefront = process.env.SHOP_FRONTEND_URL ?? 'https://your-frontend.example';
      const redirectTo = `${storefront.replace(/\/$/, '')}/thank-you?paymentId=${encodeURIComponent(query.paymentId)}`;

      return reply.redirect(302, redirectTo);
    } catch (err: any) {
      request.log.error(err, 'Error in /success updating payment');
      return reply.code(500).send('Internal error while finalizing payment');
    }
  });

  // Failure redirect (Novalnet)
  fastify.get('/failure', async (_request, reply) => {
    return reply.code(200).send('Payment failed or was cancelled.');
  });
};
