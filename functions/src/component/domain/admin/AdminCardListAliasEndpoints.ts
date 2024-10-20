import {JSONSchemaType} from "ajv";
import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ADMIN_AUTH} from "../../infrastructure/Authorization";
import {jsonValidator} from "../../tools/JsonValidator";
import {cardListAliasCreator} from "../card/seo/alias/CardListAliasEntity";


export const createCardListAliasRequestSchema:JSONSchemaType<CreateCardListAliasRequest> = {
  type: "object",
  properties: {
    canonicalSlug: { type: "string"},
    aliasSlug: { type: "string"},
    title: { type: "string", nullable: true},
    description: { type: "string", nullable: true},
    imageUrls: { type: "array", items: { type: "string" }, nullable: true },
  },
  additionalProperties: false,
  required: ["canonicalSlug", "aliasSlug", "title", "description", "imageUrls"],
}
export interface CreateCardListAliasRequest {
  canonicalSlug:string,
  aliasSlug:string,
  title:string|null,
  description:string|null,
  imageUrls:Array<string>|null,
}
export const AdminCreateCardListAlias:Endpoint = {
  path: '/card-list-alias',
  method: Method.POST,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, createCardListAliasRequestSchema)
    await cardListAliasCreator.create(request);
    return {}
  },
}