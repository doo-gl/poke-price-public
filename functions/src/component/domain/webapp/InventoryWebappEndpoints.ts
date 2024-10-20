import {JSONSchemaType} from "ajv";
import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {WEBAPP_PRO_USER_AUTH, WEBAPP_USER_AUTH} from "../../infrastructure/Authorization";
import {jsonValidator} from "../../tools/JsonValidator";
import {InventoryItemCreateManyRequest} from "../inventory/InventoryItemCreator";
import {imagesSchema} from "../item/ItemEntity";
import {currencyAmountSchema} from "../money/CurrencyAmount";
import {userContext} from "../../infrastructure/UserContext";
import {NotAuthorizedError} from "../../error/NotAuthorizedError";
import {inventoryItemDeleter} from "../inventory/InventoryItemDeleter";
import {nonNullStringArray, readParams} from "../../tools/QueryParamReader";
import {GetManyInventoryItemRequest, inventoryItemDtoRetriever} from "../inventory/InventoryItemDtoRetriever";
import {inventoryItemUpdater, InventoryItemUpdateRequest} from "../inventory/InventoryItemUpdater";
import {inventoryExporter} from "../inventory/InventoryExporter";
import {ResponseFormat} from "../../infrastructure/express/PromiseResponseMapper";
import {inventoryCreationProcessor} from "../inventory/InventoryCreationProcessor";

export const API_ROOT = '/inventory'

const createInventoryItemSchema:JSONSchemaType<InventoryItemCreateManyRequest> = {
  type: "object",
  properties: {
    inventoryItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          itemId: { type: "string" },
          itemType: { type: "string" },
          itemDetails: { type: "object", nullable: true },
          images: { ...imagesSchema, nullable: true },
          amountPaid: { ...currencyAmountSchema, nullable: true },
          userPokePrice: { ...currencyAmountSchema, nullable: true },
          note: { type: "string", nullable: true },
          datePurchased: { type: "string", nullable: true },
        },
        additionalProperties: false,
        required: ["itemId", "itemType"],
      },
    },
    syncCollections: {type: "array", items: {type: 'string'}, nullable: true},
  },
  additionalProperties: false,
  required: ["inventoryItems"],
}
export const CreateInventoryItem:Endpoint = {
  path: `${API_ROOT}/item`,
  method: Method.POST,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, createInventoryItemSchema);
    const user = userContext.getUser();
    if (!user) {
      throw new NotAuthorizedError(`No user`)
    }
    return await inventoryCreationProcessor.create(user, request)
  },
}

const deleteManyInventoryItemSchema:JSONSchemaType<{inventoryItemIds:Array<string>}> = {
  type: "object",
  properties: {
    inventoryItemIds: { type: "array", items: { type: 'string' } },
  },
  additionalProperties: false,
  required: ['inventoryItemIds'],
}
export const DeleteManyInventoryItems:Endpoint = {
  path: `${API_ROOT}/item/action/delete-items`,
  method: Method.PUT,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const user = userContext.getUser();
    if (!user) {
      throw new NotAuthorizedError(`No user`)
    }
    const request = jsonValidator.validate(req.body, deleteManyInventoryItemSchema)
    await inventoryItemDeleter.deleteManyItems(user, request.inventoryItemIds)
    return {}
  },
}

export const GetInventoryItems:Endpoint = {
  path: `${API_ROOT}/item`,
  method: Method.GET,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const request = readParams<GetManyInventoryItemRequest>(req.query, {
      itemIds: nonNullStringArray(),
    });
    const user = userContext.getUser();
    if (!user) {
      throw new NotAuthorizedError(`No user`)
    }

    return inventoryItemDtoRetriever.retrieveMany(user, request)
  },
}

const updateInventoryItemSchema:JSONSchemaType<InventoryItemUpdateRequest> = {
  type: "object",
  properties: {
    amountPaid: { ...currencyAmountSchema, nullable: true },
    userPokePrice: { ...currencyAmountSchema, nullable: true },
    itemDetails: { type: 'object', nullable: true },
    datePurchased: { type: 'string', nullable: true },
    note: { type: "string", nullable: true },
  },
  additionalProperties: false,
  required: [],
}
export const UpdateInventoryItem:Endpoint = {
  path: `${API_ROOT}/item/:id`,
  method: Method.PUT,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const id = req.params['id']
    const request = jsonValidator.validate(req.body, updateInventoryItemSchema);
    const user = userContext.getUser();
    if (!user) {
      throw new NotAuthorizedError(`No user`)
    }
    return await inventoryItemUpdater.update(id, user, request)
  }
  ,
}

export const ExportInventoryItemsJson:Endpoint = {
  path: `${API_ROOT}/item/action/export-json`,
  method: Method.GET,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    return await inventoryExporter.exportJson()
  },
}

export const ExportInventoryItemsCsv:Endpoint = {
  path: `${API_ROOT}/item/action/export-csv`,
  method: Method.GET,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    return await inventoryExporter.exportCsv()
  },
  responseFormat: ResponseFormat.STRING,
}