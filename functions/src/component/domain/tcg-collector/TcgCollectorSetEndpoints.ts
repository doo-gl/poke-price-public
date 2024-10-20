import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {BASIC_AUTH} from "../../infrastructure/Authorization";
import compression from "compression";
import {ResponseFormat} from "../../infrastructure/express/PromiseResponseMapper";
import {cardCollectionRetriever} from "../card-collection/CardCollectionRetriever";
import {collectionVisibilityUpdater} from "../card-collection/CollectionVisibilityUpdater";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {tcgCollectorSetSourcer} from "./TcgCollectorSetSourcer";


export const ImportJapaneseSet:Endpoint = {
  path: '',
  method: Method.GET,
  auth: BASIC_AUTH,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {

    const expansionName = req.query.name
    if (!expansionName) {
      throw new InvalidArgumentError("Need a 'name'")
    }
    if (Array.isArray(expansionName)) {
      throw new InvalidArgumentError("Too many names")
    }
    if (typeof expansionName !== "string") {
      throw new InvalidArgumentError("Name not a string")
    }
    const visible = req.query.visible
    if (visible && visible !== 'true' && visible !== 'false') {
      throw new InvalidArgumentError("visible not 'true' or 'false'")
    }

    // @ts-ignore
    const results = await tcgCollectorSetSourcer.source(expansionName, "jp")
    const collection = await cardCollectionRetriever.retrieveByIdempotencyKey(results.set.id)
    if (!collection) {
      throw new Error(`No collection for set: ${results.set.id}`)
    }
    if (visible && visible === 'false') {
      await collectionVisibilityUpdater.makeNotVisibleWithCards(collection.id)
    } else {
      await collectionVisibilityUpdater.makeVisibleWithCards(collection.id)
    }


    return {results}
  },
  responseFormat: ResponseFormat.STRING,
}