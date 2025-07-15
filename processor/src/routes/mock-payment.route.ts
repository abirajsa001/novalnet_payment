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
import { SessionHeaderAuthenticationHook } from '@commercetools/connect-payments-sdk';

type PaymentRoutesOptions = {
  paymentService: MockPaymentService;
  sessionHeaderAuthHook: SessionHeaderAuthenticationHook;
};

export const paymentRoutes = async (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions & PaymentRoutesOptions
) => {
  const { paymentService, sessionHeaderAuthHook } = opts;

  // 🔹 /test route — Novalnet direct request (no auth, for internal use only)
  fastify.post('/test', async (request, reply) => {
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
    };

    try {
      const response = await fetch('https://payport.novalnet.de/v2/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-NN-Access-Key': 'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=',
        },
        body: JSON.stringify(novalnetPayload),
      });

      const data = await response.json();
      return reply.send(data);
    } catch (error) {
      return reply.code(500).send({ error: 'Novalnet request failed', details: error });
    }
  });

  // 🔹 POST /payments — secure with schema
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

  // 🔹 POST /payment — alternate endpoint
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

  // 🔹 GET /failure — plain redirect
  fastify.get('/failure', async (_, reply) => {
    return reply.send('Payment failed or was canceled.');
  });

  // 🔹 GET /success — with checksum and redirect validation
  fastify.get('/success', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      tid?: string;
      status?: string;
      checksum?: string;
      txn_secret?: string;
    };

    const accessKey = 'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=';

    if (query.tid && query.status && query.checksum && query.txn_secret) {
      const tokenString = `${query.tid}${query.txn_secret}${query.status}${accessKey}`;
      const generatedChecksum = crypto.createHash('sha256').update(tokenString).digest('hex');

      if (generatedChecksum === query.checksum) {
        try {
          const result = await paymentService.createPaymentt({
            data: {
              interfaceId: query.tid,
              status: query.status,
              source: 'redirect',
            },
          });

          return reply.send({
            message: 'Redirect verified. Payment created.',
            result,
          });
        } catch (err) {
          console.error('createPayment error:', err);
          return reply.code(500).send({
            error: 'createPayment failed',
            details: err instanceof Error ? err.message : err,
          });
        }
      } else {
        return reply.code(400).send('Checksum verification failed.');
      }
    } else {
      return reply.code(400).send('Missing required query parameters.');
    }
  });
};
