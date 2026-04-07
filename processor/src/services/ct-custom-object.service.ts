// src/services/ct-custom-object.service.ts
import { apiRoot } from '../utils/custom-fields';

type CustomObjectResource = {
  id: string;
  version: number;
  container: string;
  key: string;
  value: any;
  [k: string]: any;
};

export class CustomObjectService {
  readonly DEFAULT_CONTAINER = "nn-private-data";
  
  // create (POST /custom-objects)
  async create(container: string, key: string, value: any) {
    return apiRoot.customObjects().post({
      body: { container, key, value },
    }).execute();
  }

  // upsert: POST /custom-objects (create or replace)
  async upsert(container: string, key: string, value: any) {
    return apiRoot.customObjects().post({
      body: { container, key, value },
    }).execute();
  }

  // get resource (or null)
  async get(container: string, key: string): Promise<CustomObjectResource | null> {
    return this.findByContainerAndKey(container, key);
  }
}

export default new CustomObjectService();
