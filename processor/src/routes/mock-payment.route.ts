import { SessionHeaderAuthenticationHook } from '@commercetools/connect-payments-sdk';
import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import crypto from 'crypto';

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

console.log('before-payment-routes');
log.info('before-payment-routes');

// MAIN ROUTE REGISTRATION
export const paymentRoutes = async (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions & PaymentRoutesOptions
) => {
  const { paymentService, sessionHeaderAuthHook } = opts;

  fastify.post('/test', async (request, reply) => {
    console.log("Received payment request in processor");

    const novalnetPayload = {
      merchant: {
        signature:
          '7ibc7ob5|tuJEH3gNbeWJfIHah||nbobljbnmdli0poys|doU3HJVoym7MQ44qf7cpn7pc',
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

    const novalnetResponse = await fetch(
      'https://payport.novalnet.de/v2/payment',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-NN-Access-Key':
            'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=',
        },
        body: JSON.stringify(novalnetPayload),
      }
    );

    console.log('handle-novalnetResponse');
    console.log(novalnetResponse);
  });

  // payments
  fastify.post<{ Body: PaymentRequestSchemaDTO; Reply: PaymentResponseSchemaDTO }>(
    '/payments',
    {
      preHandler: [sessionHeaderAuthHook.authenticate()],
      schema: {
        body: PaymentRequestSchema,
        response: { 200: PaymentResponseSchema },
      },
    },
    async (request, reply) => {
      const resp = await paymentService.createPayment({ data: request.body });
      return reply.status(200).send(resp);
    }
  );

  // payment
  fastify.post<{ Body: PaymentRequestSchemaDTO; Reply: PaymentResponseSchemaDTO }>(
    '/payment',
    {
      preHandler: [sessionHeaderAuthHook.authenticate()],
      schema: {
        body: PaymentRequestSchema,
        response: { 200: PaymentResponseSchema },
      },
    },
    async (request, reply) => {
      const resp = await paymentService.createPayments({ data: request.body });
      return reply.status(200).send(resp);
    }
  );

  // failure
  fastify.get('/failure', async (_, reply) => {
    return reply.send('Payment failed or was canceled.');
  });

  // success - HANDLER ADDED HERE (No separate registerRoutes)
  fastify.get('/success', handleRedirect(paymentService));
};

// HANDLER FUNCTION WITH createPayment
export const handleRedirect = (paymentService: MockPaymentService) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      tid?: string;
      status?: string;
      checksum?: string;
      txn_secret?: string;
    };

    const paymentAccessKey = 'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=';

    if (query.tid && query.status && query.checksum && query.txn_secret) {
      const tokenString = `${query.tid}${query.txn_secret}${query.status}${paymentAccessKey}`;
      const generatedChecksum = crypto
        .createHash('sha256')
        .update(tokenString)
        .digest('hex');

      if (generatedChecksum === query.checksum) {
        //  Checksum verified - now call createPayment
        const paymentData = {
          interfaceId: query.tid,
          status: query.status,
          redirectSource: 'novalnet-success',
        };

        try {
          const result = await paymentService.createPayment({
            data: paymentData,
          });

          return reply.send({
            message: 'Payment verified and created successfully.',
            result,
          });
        } catch (err) {
          return reply
            .code(500)
            .send({ error: 'createPayment failed', details: err });
        }
      } else {
        return reply.code(400).send('Checksum verification failed.');
      }
    } else {
      return reply.code(400).send('Missing required query parameters.');
    }
  };
};
