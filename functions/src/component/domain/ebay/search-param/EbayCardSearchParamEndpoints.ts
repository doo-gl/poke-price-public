import {Endpoint, Method} from "../../../infrastructure/express/Endpoint";
import {ADMIN_AUTH, BASIC_AUTH} from "../../../infrastructure/Authorization";
import {SearchParams} from "./EbayCardSearchParamEntity";
import {ebayCardSearchParamCreator} from "./EbayCardSearchParamCreator";
import {ebayCardSearchParamDeactivator} from "./EbayCardSearchParamDeactivator";
import {JSONSchemaType} from "ajv";
import {jsonValidator} from "../../../tools/JsonValidator";
import {ebaySearchParamPriceReconciler} from "./EbaySearchParamPriceReconciler";
import {globalExcludeKeywordUpdater} from "./global-exclude/GlobalExcludeKeywordUpdater";
import {ResponseFormat} from "../../../infrastructure/express/PromiseResponseMapper";
import {tempKeywordUrlRetriever} from "./temp-keyword-url/TempKeywordUrlRetriever";
import compression from "compression";

export interface CreateSearchParamRequest extends SearchParams {
  cardId:string,
}
export const createSearchParamsSchema:JSONSchemaType<CreateSearchParamRequest> = {
  type: "object",
  properties: {
    cardId: { type: "string", minLength: 1 },
    includeKeywords: { type: "array", items: { type: "string", minLength: 1 } },
    excludeKeywords: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
  required: ["cardId", "includeKeywords", "excludeKeywords"],
}
export const CreateSearchParam:Endpoint = {
  path: '',
  method: Method.POST,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, createSearchParamsSchema);
    const createdSearchParams = await ebayCardSearchParamCreator.create(request);
    return Promise.resolve(createdSearchParams);
  },
}

export const DeactivateSearchParamsForCard:Endpoint = {
  path: '/card/:cardId',
  method: Method.PUT,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    const cardId = req.params.cardId
    const deactivatedSearchParams = await ebayCardSearchParamDeactivator.deactivateForCard(cardId);
    return Promise.resolve({
      results: deactivatedSearchParams,
    });
  },
}

export const ReconcilePricesWithSearch:Endpoint = {
  path: '/:id',
  method: Method.PUT,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    const searchParamId = req.params.id
    return ebaySearchParamPriceReconciler.reconcile(searchParamId);
  },
}

export interface ExcludeKeywords {
  excludes:Array<string>,
}
export const excludeKeywordsSchema:JSONSchemaType<ExcludeKeywords> = {
  type: "object",
  properties: {
    excludes: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  required: ["excludes"],
}
export const UpdateGlobalSearchExcludes:Endpoint = {
  path: '',
  method: Method.PUT,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, excludeKeywordsSchema);
    return globalExcludeKeywordUpdater.update(request.excludes);
  },
}

export const GetAllKeywordUrlsCsv:Endpoint = {
  path: '',
  method: Method.GET,
  auth: BASIC_AUTH,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const result = await tempKeywordUrlRetriever.retrieveCsv();
    res.header('Content-Type', 'text/csv');
    return Promise.resolve(result);
  },
  responseFormat: ResponseFormat.STRING,
};