import { ClientBuilder } from '@commercetools/sdk-client-v2';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';


const projectKey = process.env.CTP_PROJECT_KEY!;
const authUrl = process.env.CTP_AUTH_URL || 'https://auth.europe-west1.gcp.commercetools.com';
const apiUrl = process.env.CTP_API_URL || 'https://api.europe-west1.gcp.commercetools.com';
const clientId = process.env.CTP_CLIENT_ID!;
const clientSecret = process.env.CTP_CLIENT_SECRET!;

// Use dynamic import for node-fetch in CommonJS
async function getApiRoot() {
  const fetch = (await import('node-fetch')).default;

  const client = new ClientBuilder()
    .withProjectKey(projectKey)
    .withClientCredentialsFlow({
      host: authUrl,
      projectKey,
      credentials: { clientId, clientSecret },
      fetch,
    })
    .withHttpMiddleware({ host: apiUrl, fetch })
    .build();

  return createApiBuilderFromCtpClient(client);
}

export { getApiRoot };
