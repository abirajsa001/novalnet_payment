import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import { Type } from '@sinclair/typebox';

import {
  PaymentRequestSchema,
  PaymentRequestSchemaDTO,
  PaymentResponseSchema,
  PaymentResponseSchemaDTO,
  CreatePaymentRequest,
} from '../dtos/mock-payment.dto';

import { MockPaymentService } from '../services/mock-payment.service';
import { SessionHeaderAuthenticationHook } from '@commercetools/connect-payments-sdk';
import { log } from '../libs/logger';

type PaymentRoutesOptions = {
  paymentService: MockPaymentService;
  sessionHeaderAuthHook: SessionHeaderAuthenticationHook;
};

log.info('before-payment-routes');

export const paymentRoutes = async (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions & PaymentRoutesOptions
) => {
  // Test Route for Novalnet server-side call
  fastify.post('/test', async (request, reply) => {
    const novalnetPayload = {
      merchant: {
        signature: '7ibc7ob5|tuJEH3gNbeWJfIHah||nbobljbnmdli0poys|doU3HJVoym7MQ44qf7cpn7pc',
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
        email: 'abiraj_s@novalnetsolutions.com',
      },
      transaction: {
        test_mode: '1',
        payment_type: 'PREPAYMENT',
        amount: 10,
        currency: 'EUR',
      },
      custom: {
        input1: 'request',
        inputval1: String(request ?? 'empty'),
        input2: 'reply',
        inputval2: String(reply ?? 'empty'),
      },
    };

    const novalnetResponse = await fetch('https://payport.novalnet.de/v2/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-NN-Access-Key': 'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=',
      },
      body: JSON.stringify(novalnetPayload),
    });

    const json = await novalnetResponse.json();
    return reply.code(200).send(json);
  });

  // Standard Payment API route
  fastify.post<{ Body: PaymentRequestSchemaDTO; Reply: PaymentResponseSchemaDTO }>(
    '/payments',
    {
      preHandler: [opts.sessionHeaderAuthHook.authenticate()],
      schema: {
        body: PaymentRequestSchema,
        response: {
          200: PaymentResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const resp = await opts.paymentService.createPayment({ data: request.body });
      return reply.code(200).send(resp);
    }
  );

  // Optional secondary payment route
  fastify.post<{ Body: PaymentRequestSchemaDTO; Reply: PaymentResponseSchemaDTO }>(
    '/payment',
    {
      preHandler: [opts.sessionHeaderAuthHook.authenticate()],
      schema: {
        body: PaymentRequestSchema,
        response: {
          200: PaymentResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const resp = await opts.paymentService.createPayments({ data: request.body });
      return reply.code(200).send(resp);
    }
  );

  // Success callback route with checksum verification
fastify.get(
  '/success',
  {
    schema: {
      response: {
        200: PaymentResponseSchema,
        400: Type.Object({
          error: Type.String(),
        }),
      },
    },
  },
  async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      tid?: string;
      status?: string;
      checksum?: string;
      txn_secret?: string;
    };

    const accessKey = 'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=';

    const { tid, status, checksum, txn_secret } = query;

    if (tid && status && checksum && txn_secret) {
      const tokenString = `${tid}${txn_secret}${status}${accessKey}`;
      const generatedChecksum = crypto.createHash('sha256').update(tokenString).digest('hex');

      if (generatedChecksum === checksum) {
        try {
          const result: PaymentResponseSchemaDTO = await opts.paymentService.createPaymentt({
            interfaceId: tid ?? '',
            status: status ?? '',
            source: 'redirect',
          });
          return reply.code(200).send(result);
        } catch (error) {
          return reply.code(400).send({ error: 'Failed to create payment from redirect.' });
        }
      } else {
        return reply.code(400).send({ error: 'Checksum verification failed.' });
      }
    } else {
      return reply.code(400).send({ error: 'Missing required query parameters.' });
    }
  }
);

};
