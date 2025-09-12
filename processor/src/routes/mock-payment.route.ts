import { SessionHeaderAuthenticationHook } from '@commercetools/connect-payments-sdk';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
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

// Add your commercetools service types
import { CtCartService } from '../services/ct-cart.service';
import { CtPaymentService } from '../services/ct-payment.service';

type PaymentRoutesOptions = {
  paymentService: MockPaymentService;
  sessionHeaderAuthHook: SessionHeaderAuthenticationHook;
  ctCartService: CtCartService;
  ctPaymentService: CtPaymentService;
};

export const paymentRoutes = async (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions & PaymentRoutesOptions
) => {
  log.info('before-payment-routes');

  fastify.post('/test', async (request, reply) => {
    console.log('Received payment request in processor');

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
          'X-NN-Access-Key': 'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=',
        },
        body: JSON.stringify(novalnetPayload),
      }
    );

    console.log('handle-novalnetResponse');
    console.log(novalnetResponse);
  });

  // Create multiple payments
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
      const resp = await opts.paymentService.createPayments({ data: request.body });
      return reply.status(200).send(resp);
    }
  );

  // Create single payment
  fastify.post<{ Body: PaymentRequestSchemaDTO; Reply: PaymentResponseSchemaDTO }>(
    '/payment',
    {
      preHandler: [opts.sessionHeaderAuthHook.authenticate()],
      schema: {
        body: PaymentRequestSchema,
        response: { 200: PaymentResponseSchema },
      },
    },
    async (request, reply) => {
      const resp = await opts.paymentService.createPayment({ data: request.body });
      return reply.status(200).send(resp);
    }
  );

  // Failure route
  fastify.get('/failure', async (_req, reply) => {
    return reply.send('Payment failed.');
  });

  // Success route with commercetools payment creation
  fastify.get('/success', async (request, reply) => {
    const query = request.query as {
      tid?: string;
      status?: string;
      checksum?: string;
      txn_secret?: string;
    };

    const accessKey = 'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=';

    if (query.tid && query.status && query.checksum && query.txn_secret) {
      const tokenString = `${query.tid}${query.txn_secret}${query.status}${accessKey}`;
      const generatedChecksum = crypto
        .createHash('sha256')
        .update(tokenString)
        .digest('hex');

      if (generatedChecksum !== query.checksum) {
        try {
          // 1. Get cart id from context
          const cartId = Context.getCartIdFromContext();
          const ctCart = await opts.ctCartService.getCart({ id: cartId });

          // 2. Create payment
          const ctPayment = await opts.ctPaymentService.createPayment({
            amountPlanned: await opts.ctCartService.getPaymentAmount({ cart: ctCart }),
            paymentMethodInfo: { paymentInterface: 'novalnet' },
            paymentStatus: {
              interfaceCode: query.status!,
              interfaceText: query.tid!,
            },
            ...(ctCart.customerId && { customer: { typeId: 'customer', id: ctCart.customerId } }),
            ...(!ctCart.customerId &&
              ctCart.anonymousId && { anonymousId: ctCart.anonymousId }),
          });

          // 3. Add payment to cart
          await opts.ctCartService.addPayment({
            resource: { id: ctCart.id, version: ctCart.version },
            paymentId: ctPayment.id,
          });

          // 4. Update payment with transaction info
          const pspReference = crypto.randomUUID();
          const updatedPayment = await opts.ctPaymentService.updatePayment({
            id: ctPayment.id,
            pspReference,
            paymentMethod: 'IDEAL',
            transaction: {
              type: 'Authorization',
              amount: ctPayment.amountPlanned,
              interactionId: pspReference,
              state: 'Success',
            },
          });

          // 5. Redirect to storefront thank-you page
          return reply.redirect(
            302,
            `https://poc-novalnetpayments.frontend.site/en/thank-you/?paymentId=${updatedPayment.id}`
          );
        } catch (error) {
          log.error(error);
          return reply.code(400).send('Catch error failed');
        }
      } else {
        return reply.code(400).send('Checksum verification failed.');
      }
    } else {
      return reply.code(400).send('Missing required query parameters.');
    }
  });

  // GET payments (optional test)
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
      const resp = await opts.paymentService.createPayment({ data: request.query });
      const thirdPartyUrl =
        'https://poc-novalnetpayments.frontend.site/en/thank-you/?orderId=c52dc5f2-f1ad-4e9c-9dc7-e60bf80d4a52';
      return reply.code(302).redirect(thirdPartyUrl);
    }
  );
};
