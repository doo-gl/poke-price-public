import {NewsEntity} from "./NewsEntity";
import {JSONSchemaType} from "ajv";
import {CreateNewsRequest} from "./NewsEndpoints";
import {jsonValidator} from "../../tools/JsonValidator";
import {Update} from "../../database/Entity";
import {baseNewsUpdater} from "./NewsRepository";
import {newsRetriever} from "./NewsRetriever";
import {publicNewsDtoRetriever} from "./PublicNewsDtoRetriever";

export interface UpdateNewsRequest {
  active?:boolean,
}

export const updateNewsSchema:JSONSchemaType<UpdateNewsRequest> = {
  type: "object",
  properties: {
    active: { type: "boolean", nullable: true},
  },
  additionalProperties: false,
  required: [],
}

const update = async (id:string, details:any):Promise<NewsEntity> => {
  const request = jsonValidator.validate(details, updateNewsSchema);
  const updateValue:Update<NewsEntity> = {};

  if (request.active !== undefined) {
    updateValue.active = request.active;
  }

  if (Object.keys(updateValue).length > 0) {
    const news = await baseNewsUpdater.update(id, updateValue);
    await publicNewsDtoRetriever.clearCache();
    return news;
  }
  return newsRetriever.retrieve(id);
}

export const newsUpdater = {
  update,
}