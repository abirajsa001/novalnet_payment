import { getApiRoot } from '../utils/ct-client';

const apiRoot = getApiRoot();

/**
 * Store transaction details in a Custom Object
 * container: 'novalnet-transactions', key: transactionId
 */
export async function saveTransaction(transactionId: string, payload: any) {
  const response = await apiRoot
    .customObjects()
    .post({
      body: {
        container: 'novalnet-transactions',
        key: transactionId,
        value: payload
      }
    })
    .execute();

  return response.body;
}

/**
 * Retrieve transaction details from Custom Object
 */
export async function getTransaction(transactionId: any) {
  try {
    const response = await apiRoot
      .customObjects()
      .withContainerAndKey({ container: 'novalnet-transactions', key: transactionId })
      .get()
      .execute();

    return response.body;
  } catch (err: any) {
    if (err?.statusCode === 404) return null; // transaction not found
    throw err;
  }
}
