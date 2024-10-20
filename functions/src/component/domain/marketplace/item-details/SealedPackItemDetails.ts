import {CardCondition} from "../../historical-card-price/CardCondition";
import {ItemDetailMapper, ItemDetails} from "../MarketplaceListingEntity";
import {itemDetailMapperFactory} from "./ItemDetailMapperFactory";


type SealedPackItemType = "sealed-pack"
export const SEALED_PACK_ITEM_TYPE:SealedPackItemType = "sealed-pack";
export interface SealedPackItemDetails extends ItemDetails {
  condition:CardCondition,
}
export type SealedPackItemDetailMapper = ItemDetailMapper<SealedPackItemType, SealedPackItemDetails>
export const sealedPackItemDetailMapper = itemDetailMapperFactory.build<SealedPackItemType, SealedPackItemDetails>(SEALED_PACK_ITEM_TYPE);