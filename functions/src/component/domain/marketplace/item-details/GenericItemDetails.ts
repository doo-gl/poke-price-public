import {ItemDetailMapper, ItemDetails} from "../MarketplaceListingEntity";
import {itemDetailMapperFactory} from "./ItemDetailMapperFactory";
import {SearchTag} from "../../search-tag/SearchTagEntity";


export type GenericItemType = "generic"
export const GENERIC_ITEM_TYPE:GenericItemType = "generic";
export interface GenericItemDetails extends ItemDetails {
  searchTags:Array<SearchTag>,
  slugExtension:string|null,
  details:{[key:string]:object|string}
}
export type GenericItemDetailMapper = ItemDetailMapper<GenericItemType, GenericItemDetails>
export const genericItemDetailMapper = itemDetailMapperFactory.build<GenericItemType, GenericItemDetails>(GENERIC_ITEM_TYPE);