import {
  ClientBuilder,
  type AuthMiddlewareOptions,
  type HttpMiddlewareOptions,
} from "@commercetools/sdk-client-v2";


import {
  createApiBuilderFromCtpClient,
} from "@commercetools/platform-sdk";


const projectKey = 'commercekey';
const authUrl = 'https://auth.europe-west1.gcp.commercetools.com';
const apiUrl = 'https://api.europe-west1.gcp.commercetools.com';
const clientId = 'zzykDtn0B_bBov_EVqk0Hvo-';
const clientSecret = '9vrhw1oyV27jiLvlOvQJpR__UVhd6ETy';

const authMiddlewareOptions: AuthMiddlewareOptions = {
  host: "https://auth.europe-west1.gcp.commercetools.com",
  projectKey,
  credentials: {
    clientId: 'zzykDtn0B_bBov_EVqk0Hvo-',
    clientSecret: '9vrhw1oyV27jiLvlOvQJpR__UVhd6ETy',
  },
};

const httpMiddlewareOptions: HttpMiddlewareOptions = {
  host: "https://api.europe-west1.gcp.commercetools.com",
};

const ctpClient = new ClientBuilder()
  .withClientCredentialsFlow(authMiddlewareOptions)
  .withHttpMiddleware(httpMiddlewareOptions)
  .build();

// THIS is your "projectApiRoot"
export const projectApiRoot = createApiBuilderFromCtpClient(ctpClient)
  .withProjectKey({ projectKey });
  
export function getApiRoot() {
  const client = new ClientBuilder()
    .withProjectKey(projectKey)
    .withClientCredentialsFlow({
      host: authUrl,
      projectKey,
      credentials: { clientId, clientSecret },
      fetch, // global fetch in Node 18+
    })
    .withHttpMiddleware({ host: apiUrl, fetch })
    .build();

  // Must scope API to project key to access resources like orders()
  return createApiBuilderFromCtpClient(client).withProjectKey({ projectKey });
}


// //~ const projectKey = process.env.CTP_PROJECT_KEY!;
// //~ const clientId = process.env.CTP_CLIENT_ID!;
// //~ const clientSecret = process.env.CTP_CLIENT_SECRET!;
// //~ const authUrl = process.env.CTP_AUTH_URL!;
// //~ const apiUrl = process.env.CTP_API_URL!;


// export function getApiRoot() {
//   return {
//     orders: () => ({
//       withOrderNumber: ({ orderNumber }: { orderNumber: string }) => ({
//         get: () => ({
//           execute: async () => {
//             console.log(`Mock fetching order for orderNumber: ${orderNumber}`);
//             // Simulate an API response
//             return {
//               body: {
//                 id: 'mock-order-id-123',
//                 orderNumber,
//                 status: 'Mocked',
//               },
//             };
//           },
//         }),
//       }),
//     }),
//   };
// }
