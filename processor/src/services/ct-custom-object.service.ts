// src/services/ct-custom-object.service.ts
import { apiRoot } from '../utils/custom-fields';

export class CustomObjectService {
  /**
   * Create or overwrite a custom object
   * container: string
   * key: string
   * value: any (must be JSON-serializable)
   */
  async upsert(container: string, key: string, value: any) {
    return apiRoot
      .customObjects()
      .post({
        body: {
          container,
          key,
          value,
        },
      })
      .execute();
  }

  /**
   * Get a custom object
   */
  async get(container: string, key: string) {
    return apiRoot
      .customObjects()
      .withContainer({ container })
      .withKey({ key })
      .get()
      .execute()
      .catch(() => null); // return null if missing
  }

  /**
   * Delete a custom object
   */
  async delete(container: string, key: string) {
    const existing = await this.get(container, key);
    if (!existing) return null;

    return apiRoot
      .customObjects()
      .withContainer({ container })
      .withKey({ key })
      .delete({ queryArgs: { version: existing.body.version } })
      .execute();
  }
}

export default new CustomObjectService();
