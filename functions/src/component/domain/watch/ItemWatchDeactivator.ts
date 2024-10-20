import {UserEntity} from "../user/UserEntity";
import {ItemWatchDto} from "./ItemWatchDto";
import {JSONSchemaType} from "ajv";
import {itemWatchRetriever} from "./ItemWatchRetriever";
import {NotFoundError} from "../../error/NotFoundError";
import {ItemWatchState, itemWatchUpdater} from "./ItemWatchEntity";
import {itemWatchDtoMapper} from "./ItemWatchDtoMapper";
import {itemRetriever} from "../item/ItemRetriever";
import {legacyIdOrFallback} from "../item/ItemEntity";


export interface ItemWatchDeactivationRequest {
  itemId:string,
}
export const itemWatchDeactivationSchema:JSONSchemaType<ItemWatchDeactivationRequest> = {
  type: "object",
  properties: {
    itemId: { type: "string" },
  },
  additionalProperties: false,
  required: ["itemId"],
}

const deactivate = async (user:UserEntity, request:ItemWatchDeactivationRequest):Promise<ItemWatchDto> => {
  const userId = user.id;
  const requestItemId = request.itemId;
  const item = await itemRetriever.retrieveByIdOrLegacyId(requestItemId)
  const itemId = item._id.toString()
  const itemWatch = await itemWatchRetriever.retrieveByUserIdAndItemId(userId, itemId)
  if (!itemWatch) {
    throw new NotFoundError(`Failed to find item watch for user: ${userId}, item: ${itemId}`)
  }
  const updatedWatch = await itemWatchUpdater.updateAndReturn(itemWatch.id, { state: ItemWatchState.INACTIVE })
  return itemWatchDtoMapper.mapWatch(updatedWatch)
}

export const itemWatchDeactivator = {
  deactivate,
}