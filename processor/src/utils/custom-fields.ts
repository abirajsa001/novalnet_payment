import {
    ClientBuilder,
    type AuthMiddlewareOptions,
    type HttpMiddlewareOptions,
  } from "@commercetools/sdk-client-v2";
  import { createApiBuilderFromCtpClient } from "@commercetools/platform-sdk";
  import { config } from "../config/config";
  
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
  
  export const createTransactionCommentsType = async () => {
    try {
      const typeExists = await apiRoot
        .types()
        .withKey({ key: "novalnet-transaction-comments" })
        .get()
        .execute()
        .catch(() => null);
  
  if (!typeExists) {
    await apiRoot
      .types()
      .post({
        body: {
          key: "novalnet-transaction-comments",
          name: { en: "Novalnet Transaction Comments" },
          resourceTypeIds: ["transaction"],
          fieldDefinitions: [
            {
              name: "transactionComments",
              label: { en: "Transaction Comments" },
              type: { name: "String" },
              required: false,
            },
            {
              name: "transactionCommentsLocalized",
              label: { en: "Transaction Comments" },
              type: { name: "LocalizedString" },
              required: false,
            }
          ],
        },
      })
      .execute();
  }
    } catch (error) {
      console.error("Error creating custom field type:", error);
    }

    const type = existing.body;

    const hasField = type.fieldDefinitions.some(
      f => f.name === "transactionCommentsLocalized"
    );
  
    if (!hasField) {
      // ADD Field to existing type
      await apiRoot
        .types()
        .withId({ ID: type.id })
        .post({
          body: {
            version: type.version,
            actions: [
              {
                action: "addFieldDefinition",
                fieldDefinition: {
                  name: "transactionCommentsLocalized",
                  label: { en: "Transaction Comments (Localized)" },
                  type: { name: "LocalizedString" },
                  required: false,
                },
              },
            ],
          },
        })
        .execute();
      log.info("Added localized field to transaction type");
    }

  };