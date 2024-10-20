import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ALLOW_ALL, BASIC_AUTH} from "../../infrastructure/Authorization";
import {publicNewsDtoRetriever} from "./PublicNewsDtoRetriever";
import moment from "moment";
import {JSONSchemaType} from "ajv";
import {newsCreator} from "./NewsCreator";
import {momentToTimestamp} from "../../tools/TimeConverter";
import {jsonValidator} from "../../tools/JsonValidator";


export const GetPublicNews:Endpoint = {
  path: '',
  method: Method.GET,
  auth: ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const result = {
      results: await publicNewsDtoRetriever.retrieveManyCached(),
    }
    return Promise.resolve(result);
  },
}

export interface CreateNewsRequest {
  date:string,
  title:string,
  description:string,
  imageUrl:string,
  backgroundImageUrl:string,
  category:string,
  newsLink:string,
}

export const createNewsSchema:JSONSchemaType<CreateNewsRequest> = {
  type: "object",
  properties: {
    date: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    imageUrl: { type: "string" },
    backgroundImageUrl:  { type: "string" },
    category: { type: "string" },
    newsLink: { type: "string" },
  },
  additionalProperties: false,
  required: ["date", "title", "description", "imageUrl", "backgroundImageUrl", "category", "newsLink"],
}

export const CreateNews:Endpoint = {
  path: '',
  method: Method.POST,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, createNewsSchema);
    const createdNews = await newsCreator.create({
      title: request.title,
      description: request.description,
      category: request.category,
      date: momentToTimestamp(moment(request.date, 'YYYY-MM-DD')),
      active: false,
      newsLink: request.newsLink,
      imageUrl: request.imageUrl,
      backgroundImageUrl: request.backgroundImageUrl,
    })
    return Promise.resolve(createdNews);
  },
}