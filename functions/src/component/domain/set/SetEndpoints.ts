import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ADMIN_AUTH, ALLOW_ALL, BASIC_AUTH} from "../../infrastructure/Authorization";
import {SetDto} from "./SetDto";
import {setDtoRetriever} from "./SetDtoRetriever";
import {nullableString, readParams} from "../../tools/QueryParamReader";
import {convertToKey} from "../../tools/KeyConverter";
import {publicSetDtoRetriever, RetrieveManyPublicSetRequest} from "./PublicSetDtoRetriever";
import {PublicSetDto} from "./PublicSetDto";
import {JSONSchemaType} from "ajv";
import {jsonValidator} from "../../tools/JsonValidator";
import {setVisibilityUpdater} from "./SetVisibilityUpdater";
import {setImagesUpdater} from "./SetImagesUpdater";
import {searchKeywordsSchema} from "../card/CardEntity";
import {setSearchKeywordUpdater} from "./SetSearchKeywordUpdater";


export const GetSet:Endpoint = {
  path: '/:id',
  method: Method.GET,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    const id = req.params['id']
    const result:SetDto = await setDtoRetriever.retrieve(id);
    return Promise.resolve(result);
  },
}

export const GetSets:Endpoint = {
  path: '',
  method: Method.GET,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    const result = {
      results: await setDtoRetriever.retrieveAll(),
    }
    return Promise.resolve(result);
  },
}

export const GetPublicSet:Endpoint = {
  path: '/:id',
  method: Method.GET,
  auth: ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const id = req.params['id']
    const result:PublicSetDto = await publicSetDtoRetriever.retrieveCached(id);
    return Promise.resolve(result);
  },
}

export const GetPublicSets:Endpoint = {
  path: '',
  method: Method.GET,
  auth: ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const request:RetrieveManyPublicSetRequest = readParams<RetrieveManyPublicSetRequest>(
      req.query,
      {
        searchKey: nullableString(),
      }
    );
    request.searchKey = request.searchKey ? convertToKey(request.searchKey) : null;
    const result = {
      results: await publicSetDtoRetriever.retrieveManyCached(request),
    }
    return Promise.resolve(result);
  },
}

interface UpdateSetVisibilityRequest {
  visible:boolean,
}

const updateSetVisibilitySchema:JSONSchemaType<UpdateSetVisibilityRequest> = {
  type: "object",
  properties: {
    visible: { type: "boolean" },
  },
  additionalProperties: false,
  required: ["visible"],
}

export const UpdateSetVisibility:Endpoint = {
  path: '/:id',
  method: Method.PUT,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    const id = req.params['id'];
    const request = jsonValidator.validate(req.body, updateSetVisibilitySchema);
    return setVisibilityUpdater.update(id, request.visible);
  },
}

export interface UpdateSetImagesRequest {
  logoUrl:string,
  backgroundUrl:string|null,
}

const updateSetImagesSchema:JSONSchemaType<UpdateSetImagesRequest> = {
  type: "object",
  properties: {
    logoUrl: { type: "string" },
    backgroundUrl: { type: "string", nullable: true},
  },
  additionalProperties: false,
  required: ["logoUrl", "backgroundUrl"],
}

export const UpdateSetImages:Endpoint = {
  path: '/:id',
  method: Method.PUT,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const id = req.params['id'];
    const request = jsonValidator.validate(req.body, updateSetImagesSchema);
    return setImagesUpdater.update(id, request);
  },
}

export const UpdateSetSearchKeywords:Endpoint = {
  path: '/:id',
  method: Method.PUT,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const id = req.params['id'];
    const request = jsonValidator.validate(req.body, searchKeywordsSchema);
    return setSearchKeywordUpdater.update(id, request);
  },
}