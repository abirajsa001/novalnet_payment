import {
  ClientBuilder,
  type AuthMiddlewareOptions,
  type HttpMiddlewareOptions,
} from "@commercetools/sdk-client-v2";
import { createApiBuilderFromCtpClient } from "@commercetools/platform-sdk";
import { config } from "../config/config";
import type {
Type,
TypeAddFieldDefinitionAction,
} from "@commercetools/platform-sdk";

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

const TYPE_KEY = "novalnet-transaction-comments";

export async function createTransactionCommentsType(): Promise<void> {
let existingType: Type | null = null;

try {
  const res = await apiRoot
    .types()
    .withKey({ key: TYPE_KEY })
    .get()
    .execute();

  existingType = res.body;
} catch {
  existingType = null;
}

// ---------------- CREATE TYPE ----------------
if (!existingType) {
  await apiRoot.types().post({
    body: {
      key: TYPE_KEY,
      name: { en: "Novalnet Transaction Comments" },
      resourceTypeIds: ["payment"], // ✅ MUST be payment
      fieldDefinitions: [
        {
          name: "transactionCommentsLocalized",
          label: { en: "Transaction Comments (Localized)" },
          type: { name: "LocalizedString" },
          required: false,
        },
      ],
    },
  }).execute();

  return;
}

// ---------------- UPDATE TYPE (ADD FIELD) ----------------
const hasField = existingType.fieldDefinitions?.some(
  (f: { name: string }) => f.name === "transactionCommentsLocalized"
);

if (!hasField) {
  const actions: TypeAddFieldDefinitionAction[] = [
    {
      action: "addFieldDefinition",
      fieldDefinition: {
        name: "transactionCommentsLocalized",
        label: { en: "Transaction Comments (Localized)" },
        type: { name: "LocalizedString" },
        required: false,
      },
    },
  ];

  await apiRoot
    .types()
    .withId({ ID: existingType.id })
    .post({
      body: {
        version: existingType.version,
        actions,
      },
    })
    .execute();
}
}
