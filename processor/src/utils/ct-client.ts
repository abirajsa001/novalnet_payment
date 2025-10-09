import { ClientBuilder } from '@commercetools/sdk-client-v2';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';
import fetch, { RequestInit, Response } from 'node-fetch';

const projectKey = process.env.CTP_PROJECT_KEY!;
const authUrl = process.env.CTP_AUTH_URL || 'https://auth.europe-west1.gcp.commercetools.com';
const apiUrl = process.env.CTP_API_URL || 'https://api.europe-west1.gcp.commercetools.com';
const clientId = process.env.CTP_CLIENT_ID!;
const clientSecret = process.env.CTP_CLIENT_SECRET!;

// Create commercetools API client
const client = new ClientBuilder()
  .withProjectKey(projectKey)
  .withClientCredentialsFlow({
    host: authUrl,
    projectKey,
    credentials: {
      clientId,
      clientSecret,
    },
    fetch: fetch as (url: string, init?: RequestInit) => Promise<Response>,
  })
  .withHttpMiddleware({
    host: apiUrl,
    fetch: fetch as (url: string, init?: RequestInit) => Promise<Response>,
  })
  .build();

export const apiRoot = createApiBuilderFromCtpClient(client);
