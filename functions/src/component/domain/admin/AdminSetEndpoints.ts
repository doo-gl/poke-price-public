import {JSONSchemaType} from "ajv";
import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ADMIN_AUTH} from "../../infrastructure/Authorization";
import {jsonValidator} from "../../tools/JsonValidator";
import {adminSetCreator, SetCreateRequest} from "../set/AdminSetCreator";
import {ebayOpenListingSourcer} from "../ebay/open-listing/EbayOpenListingSourcer";


export const setCreateRequestSchema:JSONSchemaType<SetCreateRequest> = {
  type: "object",
  properties: {
    series: { type: "string" },
    name: { type: "string" },
    displaySetNumber: { type: "string" },
    releaseDate: { type: "string" },
    symbolUrl: { type: "string" },
    backgroundImageUrl: { type: "string" },
    imageUrl: { type: "string" },
  },
  additionalProperties: false,
  required: [
    "series",
    "name",
    "displaySetNumber",
    "releaseDate",
    "symbolUrl",
    "backgroundImageUrl",
    "imageUrl",
  ],
}
export const AdminCreateSet:Endpoint = {
  path: '/set',
  method: Method.POST,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate<SetCreateRequest>(req.body, setCreateRequestSchema)
    return await adminSetCreator.create(request)
  },
}


export const AdminSourceSet:Endpoint = {
  path: '/set/action/source',
  method: Method.PUT,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    // TODO
    // {source:'TCG_COLLECTOR', region?:'jp', id:'Box Topper (E-Card Series)', withReverseHolos?:boolean}

    return {}
  },
}