import {JSONSchemaType} from "ajv";
import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ADMIN_AUTH} from "../../infrastructure/Authorization";
import {jsonValidator} from "../../tools/JsonValidator";
import {itemBulkCsvImporter, ItemBulkCsvImportRequest, ItemCsvImportType} from "../item/import/ItemBulkCsvImporter";
import compression from "compression";
import {listingsEndingSoonCsvRetriever} from "../ebay/open-listing/ListingsEndingSoonCsvRetriever";
import {ResponseFormat} from "../../infrastructure/express/PromiseResponseMapper";
import {csvGenericItemExporter} from "../item/export/CsvGenericItemExporter";


export const itemBulkCsvImportRequestSchema:JSONSchemaType<ItemBulkCsvImportRequest> = {
  type: "object",
  properties: {
    itemType: { type: "string", anyOf: Object.keys(ItemCsvImportType).map(value => ({ const: value })) },
    csv: { type: "string" },
  },
  additionalProperties: false,
  required: ["itemType", "csv"],
}
export const AdminBulkCsvCreateItem:Endpoint = {
  path: '/item/action/bulk-csv-create',
  method: Method.POST,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate<ItemBulkCsvImportRequest>(req.body, itemBulkCsvImportRequestSchema)
    return await itemBulkCsvImporter.importFromCsv(request)
  },
}

export const AdminGetSealedItemsCsv:Endpoint = {
  path: '/item/action/sealed-items-csv',
  method: Method.GET,
  auth: ADMIN_AUTH,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const result = await csvGenericItemExporter.exportSealedItems();
    res.header('Content-Type', 'text/csv');
    return Promise.resolve(result);
  },
  responseFormat: ResponseFormat.STRING,
};