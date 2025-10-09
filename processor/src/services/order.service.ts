import { getApiRoot } from '../utils/ct-client';
import { Order } from '@commercetools/platform-sdk';

export async function getOrderByOrderNumber(orderNumber: string): Promise<Order | null> {
  try {
    const apiRoot = getApiRoot();

    const response = await apiRoot
      .orders()
      .withOrderNumber({ orderNumber })
      .get()
      .execute();

    return response.body;
  } catch (error: any) {
    // if (error.statusCode === 404) return null;
    // console.error('Error fetching order:', error);
    // throw error;
  }
}

export async function getOrderIdFromOrderNumber(orderNumber: string): Promise<string | null> {
  const order = await getOrderByOrderNumber(orderNumber);
  return order ? order.id : null;
}
