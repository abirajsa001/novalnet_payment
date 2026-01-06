import {
  ClientBuilder,
  type AuthMiddlewareOptions,
  type HttpMiddlewareOptions,
} from "@commercetools/sdk-client-v2";
import {
  createApiBuilderFromCtpClient,
  type FieldDefinition,
  type Type,
} from "@commercetools/platform-sdk";
import { config } from "../config/config";

/* -------------------------------------------------------------------------- */
/* API CLIENT                                                                  */
/* -------------------------------------------------------------------------- */

const authOptions: AuthMiddlewareOptions = {
  host: config.authUrl,
  projectKey: config.projectKey,
  credentials: {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  },
};

const httpOptions: HttpMiddlewareOptions = {
  host: config.apiUrl,
};

const ctpClient = new ClientBuilder()
  .withClientCredentialsFlow(authOptions)
  .withHttpMiddleware(httpOptions)
  .build();

export const apiRoot = createApiBuilderFromCtpClient(ctpClient).withProjectKey({
  projectKey: config.projectKey,
});

/* -------------------------------------------------------------------------- */
/* CUSTOM TYPE LOGIC                                                           */
/* -------------------------------------------------------------------------- */

const TYPE_KEY = "novalnet-transaction-comments";

export const createTransactionCommentsType = async (): Promise<void> => {
  try {
    const typeExists = await apiRoot
      .types()
      .withKey({ key: TYPE_KEY })
      .get()
      .execute()
      .catch(() => null);

    // 1️⃣ CREATE if NOT exists
    if (!typeExists) {
      await apiRoot.types().post({
        body: {
          key: TYPE_KEY,
          name: { en: "Novalnet Transaction Comments" },
          resourceTypeIds: ["transaction"],
          fieldDefinitions: [
            {
              name: "transactionComments",
              label: { en: "Transaction Comments" },
              type: { name: "String" },
              required: false,
            },
          ],
        },
      }).execute();

      console.info("Custom type created:", TYPE_KEY);
      return;
    }

  } catch (error) {
    console.error("Error creating custom field type:", error);
    throw error;
  }
};
