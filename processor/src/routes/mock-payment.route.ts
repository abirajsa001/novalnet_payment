import { SessionHeaderAuthenticationHook } from '@commercetools/connect-payments-sdk';
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest} from 'fastify';
import { getCartIdFromContext } from '../libs/fastify/context/context';
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
console.log('before-payment-routes');
log.info('before-payment-routes');
export const paymentRoutes = async (fastify: FastifyInstance, opts: FastifyPluginOptions & PaymentRoutesOptions) => {

fastify.post('/test', async (request, reply) => {
  console.log("Received payment request in processor");
    // Call Novalnet API server-side (no CORS issue)
  const novalnetPayload = {
    merchant: {
      signature: '7ibc7ob5|tuJEH3gNbeWJfIHah||nbobljbnmdli0poys|doU3HJVoym7MQ44qf7cpn7pc',
      tariff: '10004',
    },
    customer: {
  	  billing : {
    		city          : 'test',
    		country_code  : 'DE',
    		house_no      : 'test',
    		street        : 'test',
    		zip           : '68662',
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
	  }
  };

  const novalnetResponse = await fetch('https://payport.novalnet.de/v2/payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-NN-Access-Key': 'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=',
    },
    body: JSON.stringify(novalnetPayload),
  });
console.log('handle-novalnetResponse');
    console.log(novalnetResponse);

});

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
      const resp = await opts.paymentService.createPayments({
        data: request.body,
      });

      return reply.status(200).send(resp);

    },
  );


fastify.get('/callback', async (request, reply) => {
    return reply.send('sucess');
});

fastify.get('/webhook', async (request, reply) => {
    return reply.send('sucess');
});
	
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
      const resp = await opts.paymentService.createPayment({
        data: request.body,
      });

      return reply.status(200).send(resp);

    },
  );


  fastify.get('/success', async (request, reply) => {
    const query = request.query as {
      tid?: string;
      status?: string;
      checksum?: string;
      txn_secret?: string;
      paymentReference?: string;
      ctsid?: string;
    };

    const accessKey = 'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=';
    
    if (query.tid && query.status && query.checksum && query.txn_secret) {
      const tokenString = `${query.tid}${query.txn_secret}${query.status}${accessKey}`;
      const generatedChecksum = crypto.createHash('sha256').update(tokenString).digest('hex');

      //if (generatedChecksum === query.checksum) {
        try {
          const result = await opts.paymentService.createPaymentt({
            data: {
              interfaceId: query.tid,
              status: query.status,
              paymentReference: query.paymentReference,
            },
          });
			
          const successPageHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Payment Successful</title>
              <script>
                window.onload = function() {
                  if (window.opener) {
                    window.opener.postMessage({
                      type: 'PAYMENT_SUCCESS',
                      paymentReference: '${query.paymentReference}',
                      transactionId: '${query.tid}'
                    }, '*');
                    window.close();
                  } else {
                    setTimeout(() => {
                      window.location.href = '/payment-complete?success=true&paymentReference=${query.paymentReference || query.tid}';
                    }, 2000);
                  }
                };
              </script>
            </head>
            <body>
              <h1>Payment Successful!</h1>
              <p>Your payment has been processed successfully.</p>
              <p>Redirecting...</p>
            </body>
            </html>
          `;
          
          return reply.type('text/html').send(successPageHtml);
        } catch (error) {
          log.error('Error processing payment:', error);
          return reply.code(400).send('Payment processing failed');
        }
      //} else {
       // return reply.code(400).send('Checksum verification failed.');
      //}
    } else {
      return reply.code(400).send('Missing required query parameters.');
    }
  });

  fastify.get('/failure', async (request, reply) => {
    const query = request.query as {
      tid?: string;
      status?: string;
      paymentReference?: string;
    };

    const failurePageHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Failed</title>
        <script>
          window.onload = function() {
            if (window.opener) {
              window.opener.postMessage({
                type: 'PAYMENT_FAILURE',
                paymentReference: '${query.paymentReference || ''}',
                transactionId: '${query.tid || ''}'
              }, '*');
              window.close();
            } else {
              setTimeout(() => {
                window.location.href = '/payment-complete?success=false&paymentReference=${query.paymentReference || query.tid || ''}';
              }, 2000);
            }
          };
        </script>
      </head>
      <body>
        <h1>Payment Failed</h1>
        <p>Your payment could not be processed.</p>
        <p>Redirecting...</p>
      </body>
      </html>
    `;
    
    return reply.type('text/html').send(failurePageHtml);
  });

  fastify.get('/payment-complete', async (request, reply) => {
    const query = request.query as {
      success?: string;
      paymentReference?: string;
    };
    
    const isSuccess = query.success === 'true';
    const paymentRef = query.paymentReference || '';
    
    const completePage = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment ${isSuccess ? 'Complete' : 'Failed'}</title>
      </head>
      <body>
        <h1>Payment ${isSuccess ? 'Successful' : 'Failed'}</h1>
        ${isSuccess ? 
          `<p>Payment Reference: ${paymentRef}</p><p>Thank you for your purchase!</p>` : 
          '<p>Payment was not successful. Please try again.</p>'
        }
      </body>
      </html>
    `;
    
    
    return reply.type('text/html').send(completePage);
  });


fastify.get<{ 
  Querystring: PaymentRequestSchemaDTO; 
  Reply: PaymentResponseSchemaDTO 
}>(
  '/payments',
  {
    preHandler: [opts.sessionHeaderAuthHook.authenticate()],
    schema: {
      querystring: PaymentRequestSchema, 
      response: {
        200: PaymentResponseSchema,
      },
    },
  },
  async (request, reply) => {
    const resp = await opts.paymentService.createPayment({
      data: request.query,
    });
    const thirdPartyUrl = 'https://poc-novalnetpayments.frontend.site/en/thank-you/?orderId=c52dc5f2-f1ad-4e9c-9dc7-e60bf80d4a52';
    // return reply.redirect(302, thirdPartyUrl);
    return reply.code(302).redirect(thirdPartyUrl);
    // return reply.status(200).send(resp);
  }
);

};
