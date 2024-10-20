import {Entity} from "../../database/Entity";
import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {CardCondition} from "../historical-card-price/CardCondition";
import {Images} from "../item/ItemEntity";
import {repositoryFactory} from "../../database/RepositoryFactory";
import {GradingModificationDetails} from "../modification/ItemModification";
import {Timestamp} from "../../external-lib/Firebase";

const COLLECTION_NAME = 'inventory-item'

export interface InventoryItemEntity extends Entity {
  userId:string,
  itemId:string,
  itemType:string,
  itemDetails:any,
  amountPaid:CurrencyAmountLike|null, // the price the user paid for the item
  userPokePrice?:CurrencyAmountLike|null, // the price the user thinks is the poke price for this item
  dateUserPokePriceSet?:Timestamp|null, // the date the user poke price was set - to allow us to track over time
  images:Images|null,
  note?:string|null,
  datePurchased?:Timestamp|null,

}

export interface SingleCardInventoryItemDetails {
  condition:CardCondition,
  grade:GradingModificationDetails|null
}

const result = repositoryFactory.build<InventoryItemEntity>(COLLECTION_NAME);
export const inventoryItemRepository = result.repository;
export const baseInventoryItemCreator = result.creator;
export const baseInventoryItemUpdater = result.updater;
export const baseInventoryItemDeleter = result.deleter;