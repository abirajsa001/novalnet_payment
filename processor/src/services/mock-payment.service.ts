import {
  SessionHeaderAuthenticationHook,
} from '@commercetools/connect-payments-sdk';
import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import crypto from 'crypto';
import * as Context from '../libs/fastify/context/context';

import {
  PaymentRequestSchema,
  PaymentRequestSchemaDTO,
  PaymentResponseSchema,
  PaymentResponseSchemaDTO,
} from '../dtos/mock-payment.dto';
import { MockPaymentService } from '../services/mock-payment.service';
import { log } from '../libs/logger';

type PaymentRoutesOptions = {
  paymentService: MockPaymentService;
  sessionHeaderAuthHook: SessionHeaderAuthenticationHook;
};

export const paymentRoutes = async (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions & PaymentRoutesOptions,
) => {
  log.info('Registering payment routes');

  // ---------- Test Route ----------
  fastify.post('/test', async (request, reply) => {
    const payload = {
      merchant: {
        signature: process.env.NOVALNET_SIGNATURE ?? '',
        tariff: '10004',
      },
      customer: {
        billing: {
          city: 'test',
          country_code: 'DE',
          house_no: 'test',
          street: 'test',
          zip: '68662',
        },
        first_name: 'Max',
        last_name: 'Mustermann',
        email: 'test@example.com',
      },
      transaction: {
        test_mode: '1',
        payment_type: 'PREPAYMENT',
        amount: 10,
        currency: 'EUR',
      },
    };

    const novalnetResponse = await fetch('https://payport.novalnet.de/v2/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-NN-Access-Key': process.env.NOVALNET_KEY ?? '',
      },
      body: JSON.stringify(payload),
    });

    let parsedResponse: any = {};
    try {
      parsedResponse = await novalnetResponse.json();
    } catch {
      parsedResponse = {};
    }

    return reply.code(200).send(parsedResponse);
  });

  // ---------- Create Payment ----------
  fastify.post<{ Body: PaymentRequestSchemaDTO; Reply: PaymentResponseSchemaDTO }>(
    '/payments',
    {
      preHandler: [opts.sessionHeaderAuthHook.authenticate()],
      schema: { body: PaymentRequestSchema, response: { 200: PaymentResponseSchema } },
    },
    async (request, reply) => {
      const resp = await opts.paymentService.createPayments({ data: request.body });
      return reply.status(200).send(resp);
    },
  );

  // ---------- Single Payment ----------
  fastify.post<{ Body: PaymentRequestSchemaDTO; Reply: PaymentResponseSchemaDTO }>(
    '/payment',
    {
      preHandler: [opts.sessionHeaderAuthHook.authenticate()],
      schema: { body: PaymentRequestSchema, response: { 200: PaymentResponseSchema } },
    },
    async (request, reply) => {
      const resp = await opts.paymentService.createPayment({ data: request.body });
      return reply.status(200).send(resp);
    },
  );

  // ---------- Success Callback ----------
  fastify.get('/success', async (request, reply) => {
    const query = request.query as {
      tid?: string;
      status?: string;
      checksum?: string;
      txn_secret?: string;
    };

    const accessKey = process.env.NOVALNET_KEY ?? '';
    if (query.tid && query.status && query.checksum && query.txn_secret) {
      const tokenString = `${query.tid}${query.txn_secret}${query.status}${accessKey}`;
      const generatedChecksum = crypto
        .createHash('sha256')
        .update(tokenString)
        .digest('hex');

      if (generatedChecksum !== query.checksum) {
        // Call your service with empty data – you said you'll fetch payment/cart inside the service
        const result = await opts.paymentService.createPaymenttest({});

        const thankYouUrl =
          'https://poc-novalnetpayments.frontend.site/en/thank-you/?orderId=' +
          (result?.id ?? 'unknown');
        return reply.code(302).redirect(thankYouUrl);
      }
      return reply.code(400).send('Checksum verification failed.');
    }
    return reply.code(400).send('Missing required query parameters.');
  });

  // ---------- Failure ----------
  fastify.get('/failure', async (_req, reply) => {
    return reply.send('Payment failed.');
  });

  // ---------- GET /payments (redirect) ----------
  fastify.get<{ Querystring: PaymentRequestSchemaDTO; Reply: PaymentResponseSchemaDTO }>(
    '/payments',
    {
      preHandler: [opts.sessionHeaderAuthHook.authenticate()],
      schema: {
        querystring: PaymentRequestSchema,
        response: { 200: PaymentResponseSchema },
      },
    },
    async (request, reply) => {
      await opts.paymentService.createPayment({ data: request.query });
      const thirdPartyUrl =
        'https://poc-novalnetpayments.frontend.site/en/thank-you/?orderId=c52dc5f2-f1ad-4e9c-9dc7-e60bf80d4a52';
      return reply.code(302).redirect(thirdPartyUrl);
    },
  );
};
