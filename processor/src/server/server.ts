import autoLoad from '@fastify/autoload';
import cors from '@fastify/cors';
import fastifyFormBody from '@fastify/formbody';
import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { join } from 'path';
import { config } from '../config/config';
import { requestContextPlugin } from '../libs/fastify/context/context';
import { errorHandler } from '../libs/fastify/error-handler';
// import { registerRoutes } from '../routes/mock-payment.route'; 
// import { MockPaymentService } from '../services/mock-payment.service';
// import { paymentSDK } from '../payment-sdk';

export const setupFastify = async () => {
  const server = Fastify({
    logger: {
      level: config.loggerLevel,
    },
    genReqId: () => randomUUID().toString(),
    requestIdLogLabel: 'requestId',
    requestIdHeader: 'x-request-id',
  });

  server.setErrorHandler(errorHandler);

  await server.register(cors, {
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Request-ID', 'X-Session-ID'],
    origin: '*',
  });

  await server.register(fastifyFormBody);

  await server.register(requestContextPlugin);

  await server.register(autoLoad, {
    dir: join(__dirname, 'plugins'),
  });

  // await registerRoutes(server);

  // const mockPaymentService = new MockPaymentService({
  //   ctCartService: paymentSDK.ctCartService,
  //   ctPaymentService: paymentSDK.ctPaymentService,
  // });

  // await registerRoutes(server, { paymentService: mockPaymentService, sessionHeaderAuthHook: paymentSDK.sessionHeaderAuthHookFn });

  return server;
};
