import autoLoad from '@fastify/autoload';
import cors from '@fastify/cors';
import fastifyFormBody from '@fastify/formbody';
import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { join } from 'path';

import { config } from '../config/config';
import { requestContextPlugin } from '../libs/fastify/context/context';
import { errorHandler } from '../libs/fastify/error-handler';
import { registerRoutes } from '../routes/mock-payment.route';
import { MockPaymentService } from '../services/mock-payment.service';
import { sessionHeaderAuthHook } from '../libs/commercetools/session-header-auth-hook'; // ✅ Assuming this is your hook

// You must import these services or mock them if not yet implemented
import { ctCartService } from '../libs/commercetools/ct-cart.service';
import { ctPaymentService } from '../libs/commercetools/ct-payment.service';

export const setupFastify = async () => {
  const server = Fastify({
    logger: {
      level: config.loggerLevel, // 'info' or 'debug'
    },
    genReqId: () => randomUUID().toString(),
    requestIdLogLabel: 'requestId',
    requestIdHeader: 'x-request-id',
  });

  // Global error handler
  server.setErrorHandler(errorHandler);

  // CORS setup
  await server.register(cors, {
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Correlation-ID',
      'X-Request-ID',
      'X-Session-ID',
    ],
    origin: '*',
  });

  // Form body parsing
  await server.register(fastifyFormBody);

  // Request context
  await server.register(requestContextPlugin);

  // Auto-load plugins if needed
  await server.register(autoLoad, {
    dir: join(__dirname, 'plugins'),
  });

  // Create an instance of your payment service
  const paymentService = new MockPaymentService({
    ctCartService,
    ctPaymentService,
  });

  // Register payment-related routes
  await registerRoutes(server, {
    paymentService,
    sessionHeaderAuthHook,
  });

  // Optionally log all registered routes
  console.log(server.printRoutes());

  return server;
};
