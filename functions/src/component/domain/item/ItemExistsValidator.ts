import {NotFoundError} from "../../error/NotFoundError";
import {itemRetriever} from "./ItemRetriever";


const validate = async (itemIds:Array<string>):Promise<void> => {
  const items = await itemRetriever.retrieveManyByIdOrLegacyId(itemIds)
  const foundItemIds = new Set<string>()
  items.forEach(item => {
    foundItemIds.add(item._id.toString())
    if (item.legacyId) {
      foundItemIds.add(item.legacyId)
    }
  })
  const missingItemIds = itemIds.filter(itemId => !foundItemIds.has(itemId))
  if (missingItemIds.length > 0) {
    throw new NotFoundError(`Failed to find items: ${missingItemIds.join(',')}`)
  }
  return
}

export const itemExistsValidator = {
  validate,
}