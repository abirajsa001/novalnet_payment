import { getApiRoot } from '../utils/ct-client';
import { log } from '../libs/logger';

/**
 * Store transaction details in a Custom Object
 * container: 'novalnet-transactions', key: transactionId
 */
export async function saveTransaction(transactionId: string, payload: any) {
  try {
    if (!transactionId) {
      throw new Error('Transaction ID is required');
    }
    
    const apiRoot = getApiRoot();
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

    log.info(`Transaction ${transactionId} saved successfully`);
    return response.body;
  } catch (error) {
    log.error(`Failed to save transaction ${transactionId}:`, error);
    throw error;
  }
}

/**
 * Retrieve transaction details from Custom Object
 */
export async function getTransaction(transactionId: any) {
  try {
    if (!transactionId) {
      throw new Error('Transaction ID is required');
    }
    
    const apiRoot = getApiRoot();
    const response = await apiRoot
      .customObjects()
      .withContainerAndKey({ container: 'novalnet-transactions', key: transactionId })
      .get()
      .execute();

    log.info(`Transaction ${transactionId} retrieved successfully`);
    return response.body;
  } catch (err: any) {
    if (err?.statusCode === 404) {
      log.info(`Transaction ${transactionId} not found`);
      return null;
    }
    log.error(`Failed to get transaction ${transactionId}:`, err);
    throw err;
  }
}
