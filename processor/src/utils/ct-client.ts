import { ClientBuilder } from '@commercetools/sdk-client-v2';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';

const projectKey = 'newprojectkey';
const authUrl = 'https://auth.europe-west1.gcp.commercetools.com';
const apiUrl = 'https://api.europe-west1.gcp.commercetools.com';
const clientId = 'PvpIwckG4tM69ATbESCg362e';
const clientSecret = 'hLSoCgHZu7er7zNVhnqTWgFsTuJllBXL';

// Define fetch dynamically
const fetchFn = (...args: [RequestInfo, RequestInit?]): Promise<Response> =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Build commercetools client
const client = new ClientBuilder()
  .withProjectKey(projectKey)
  .withClientCredentialsFlow({
    host: authUrl,
    projectKey,
    credentials: {
      clientId,
      clientSecret,
    },
    fetch: fetchFn,
  })
  .withHttpMiddleware({
    host: apiUrl,
    fetch: fetchFn,
  })
  .build();

export const apiRoot = createApiBuilderFromCtpClient(client);
