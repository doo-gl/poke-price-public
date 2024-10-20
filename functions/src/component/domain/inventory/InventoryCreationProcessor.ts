import {UserEntity} from "../user/UserEntity";
import {InventoryItemCreateManyRequest, inventoryItemCreator} from "./InventoryItemCreator";
import {percentileDetailCalculator, PercentileDetails} from "../card-ownership/stats/PercentileDetailCalculator";
import {logger} from "firebase-functions";
import {inventoryItemMapper, PublicInventoryItemDto} from "./InventoryItemMapper";

export interface InventoryItemCreateManyResponse {
  before:PercentileDetails|null,
  after:PercentileDetails|null,
  newInventoryItems:Array<PublicInventoryItemDto>
}

const getDetails = async (user:UserEntity, request:InventoryItemCreateManyRequest):Promise<PercentileDetails|null> => {
  try {
    return await percentileDetailCalculator.calculate(
      user.id,
      request.inventoryItems.map(inv => inv.itemId)
    )
  } catch (err:any) {
    logger.error(`Failed to fetch percentile details: ${err.message}`, err)
    return null
  }
}

const create = async (user:UserEntity, request:InventoryItemCreateManyRequest):Promise<InventoryItemCreateManyResponse> => {
  const before = await getDetails(user, request)
  const newInventory = await inventoryItemCreator.create(user, request)
  const after = await getDetails(user, request)
  return {
    before,
    after,
    newInventoryItems: newInventory,
  }
}

export const inventoryCreationProcessor = {
  create,
}