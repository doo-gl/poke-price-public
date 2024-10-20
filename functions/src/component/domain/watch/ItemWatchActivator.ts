import {UserEntity} from "../user/UserEntity";
import {ItemWatchDto} from "./ItemWatchDto";
import {JSONSchemaType} from "ajv";
import {itemWatchRetriever} from "./ItemWatchRetriever";
import {itemWatchCreator, ItemWatchEntity, ItemWatchState, itemWatchUpdater} from "./ItemWatchEntity";
import {Create} from "../../database/Entity";
import {itemWatchDtoMapper} from "./ItemWatchDtoMapper";
import {userMembershipQuerier} from "../membership/UserMembershipQuerier";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {itemRetriever} from "../item/ItemRetriever";
import {legacyIdOrFallback} from "../item/ItemEntity";

export const MAX_PRO_WATCHES = 50;

export interface ItemWatchActivationRequest {
  itemId:string,
}
export const itemWatchActivationSchema:JSONSchemaType<ItemWatchActivationRequest> = {
  type: "object",
  properties: {
    itemId: { type: "string" },
  },
  additionalProperties: false,
  required: ["itemId"],
}

const validateActivateWatch = async (user:UserEntity):Promise<void> => {
  const isPokePriceProUser = userMembershipQuerier.isPokePriceProUser(user)
  if (!isPokePriceProUser) {
    const hasWatches = await itemWatchRetriever.userHasActiveWatches(user.id);
    if (hasWatches) {
      throw new InvalidArgumentError(`Cannot add additional watches`)
    }
  } else {
    const watches = await itemWatchRetriever.retrieveActiveByUserId(user.id)
    if (watches.length >= MAX_PRO_WATCHES) {
      throw new InvalidArgumentError(`Cannot add additional watches`)
    }
  }
}

const activateForUserIdAndItemId = async (userId:string, itemId:string):Promise<ItemWatchEntity> => {
  const preExistingWatch = await itemWatchRetriever.retrieveByUserIdAndItemId(userId, itemId)
  if (preExistingWatch) {
    if (preExistingWatch.state === ItemWatchState.ACTIVE) {
      return preExistingWatch
    }
    return await itemWatchUpdater.updateAndReturn(preExistingWatch.id, { state: ItemWatchState.ACTIVE })
  }
  const create:Create<ItemWatchEntity> = {
    userId,
    itemId,
    state: ItemWatchState.ACTIVE,
  }
  return await itemWatchCreator.create(create)
}

const activate = async (user:UserEntity, request:ItemWatchActivationRequest):Promise<ItemWatchDto> => {
  await validateActivateWatch(user)
  const userId = user.id;
  const requestItemId = request.itemId;
  const item = await itemRetriever.retrieveByIdOrLegacyId(requestItemId)
  const itemId = item._id.toString()
  const itemWatch = await activateForUserIdAndItemId(userId, itemId)
  return itemWatchDtoMapper.mapWatch(itemWatch)
}

export const itemWatchActivator = {
  activate,
}