import {Environment} from "./WebappHtmlEntity";
import {singleResultRepoQuerier} from "../../database/SingleResultRepoQuerier";
import {webappHtmlRepository} from "./WebappHtmlRepository";
import {logger} from "firebase-functions";


const retrieveHtml = async (environment:Environment):Promise<string> => {
  logger.info(`Retrieve HTML for ${environment}`)
  const entity = await singleResultRepoQuerier.queryOrThrow(
    webappHtmlRepository,
    [{ name: "environment", value: environment }],
    webappHtmlRepository.collectionName,
  );
  return entity.html;
}

export const webappHtmlRetriever = {
  retrieveHtml,
}