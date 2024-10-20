import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {BASIC_AUTH} from "../../infrastructure/Authorization";
import {Environment} from "./WebappHtmlEntity";
import {JSONSchemaType} from "ajv";
import {jsonValidator} from "../../tools/JsonValidator";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {baseWebappHtmlUpdater, webappHtmlRepository} from "./WebappHtmlRepository";
import {singleResultRepoQuerier} from "../../database/SingleResultRepoQuerier";

export interface UpdateHtmlRequest {
  environment:Environment,
  html:string,
}
export const updateHtmlSchema:JSONSchemaType<UpdateHtmlRequest> = {
  type: "object",
  properties: {
    environment: { type: "string" },
    html: { type: "string" },
  },
  additionalProperties: false,
  required: ["environment", "html"],
}
export const UpdateHtml:Endpoint = {
  path: '',
  method: Method.PUT,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, updateHtmlSchema);
    if (request.environment !== Environment.DEV && request.environment !== Environment.PROD) {
      throw new InvalidArgumentError(`Invalid environment: ${request.environment}`);
    }
    const entity = await singleResultRepoQuerier.queryOrThrow(
      webappHtmlRepository,
      [{ name: "environment", value: request.environment }],
      webappHtmlRepository.collectionName,
    );
    await baseWebappHtmlUpdater.update(entity.id, { html: request.html });
    return {updated: true}
  },
}