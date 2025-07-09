import { SessionHeaderAuthenticationHook } from '@commercetools/connect-payments-sdk';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
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
  opts: FastifyPluginOptions & PaymentRoutesOptions
) => {
  log.info('before-payment-routes');

  // ✅ /test route — Novalnet request and response
  fastify.post('/test', async (request, reply) => {
    log.info('Received payment request in /test');

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
        return_url: 'https://yourdomain.com/checkout/success',
        error_return_url: 'https://yourdomain.com/checkout/failure',
      },
      custom: {
        input1: 'request',
        inputval1: JSON.stringify(request.body ?? 'empty'),
        input2: 'reply',
        inputval2: 'FastifyReply',
      },
    };

    try {
      const novalnetResponse = await fetch('https://payport.novalnet.de/v2/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-NN-Access-Key': 'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=',
        },
        body: JSON.stringify(novalnetPayload),
      });

      const data = await novalnetResponse.json();

      log.info('Novalnet response:', data);

      if (data?.result?.status === 'SUCCESS' && data?.result?.redirect_url) {
        // ✅ Redirect to the Novalnet-hosted page
        return reply.redirect(data.result.redirect_url);
      } else {
        return reply.code(400).send({
          error: 'Novalnet payment initiation failed',
          details: data,
        });
      }
    } catch (error) {
      log.error('Novalnet request failed', error);
      return reply.code(500).send({ error: 'Internal server error', message: error });
    }
  });

  // 🔄 Standard payment route for commercetools
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
      const resp = await opts.paymentService.createPayment({
        data: request.body,
      });

      return reply.status(200).send(resp);
    }
  );
};
