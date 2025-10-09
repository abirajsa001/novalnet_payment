import { ClientBuilder } from '@commercetools/sdk-client-v2';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';
import fetch, { RequestInit, Response } from 'node-fetch';

const projectKey = 'newprojectkey';
const authUrl = 'https://auth.europe-west1.gcp.commercetools.com';
const apiUrl = 'https://api.europe-west1.gcp.commercetools.com';
const clientId = 'PvpIwckG4tM69ATbESCg362e';
const clientSecret = 'hLSoCgHZu7er7zNVhnqTWgFsTuJllBXL';

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
