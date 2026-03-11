export class CollectionGenerator {

  async generate(apis) {
    const collection = {
      info: {
        name: `QASL·TOMEX Auto-Generated — ${new Date().toISOString()}`,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: apis.map((api, i) => this.buildItem(api, i + 1))
    };
    return collection;
  }

  buildItem(api, index) {
    const urlObj = new URL(api.url);
    return {
      name: `${String(index).padStart(2,'0')} ${api.method} ${urlObj.pathname}`,
      request: {
        method: api.method,
        header: [],
        url: {
          raw: api.url,
          protocol: urlObj.protocol.replace(':', ''),
          host: [urlObj.hostname],
          port: urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80'),
          path: urlObj.pathname.split('/').filter(Boolean)
        }
      }
    };
  }
}