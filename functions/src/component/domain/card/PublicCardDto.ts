import {CardId, UniqueCard} from "./UniqueCard";
import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {Image, ImageOverlay} from "./CardEntity";
import {SetId} from "../set/UniqueSet";
import {RelatedItem, RelatedItems} from "../item/ItemEntity";

export interface Tag {
  name:string,
  value:string,
}

export interface SetDetailsDto {
  setId:string,
  name:string,
  imageUrl:string,
  backgroundImageUrl:string|null
  symbolUrl:string|null,
  releaseDate:string,
}

// The card dto that an anonymous user is allowed to see
export interface PublicCardDto extends CardId, UniqueCard, SetId {
  countInSet:number,
  displaySetNumber:string,
  name:string,
  displayName:string,
  pokePrice:CurrencyAmountLike,
  numberOfSales:number|null,
  availableFromPrice:CurrencyAmountLike|null,
  pricesUpdatedAt:string|null,
  rarity:string|null,
  subType:string,
  superType:string,
  ebaySearchLink:string|null,
  image:Image,
  imageOverlays:Array<ImageOverlay>,
  hasSoldListingUrl:boolean,
  hasOpenListingUrl:boolean,
  cardDescription:Array<string>,
  content:CardContent,

  setDisplayName:string,

  pokePriceV2:CurrencyAmountLike|null,
  numberOfSalesV2:number|null,
  availableFromPriceV2:CurrencyAmountLike|null,
  highListingPriceV2:CurrencyAmountLike|null,
  numberOfListingsV2:number|null,
  pricesUpdatedAtV2:string|null,
  contentV2:Content,
  rating:number|null,

  slug:string|null,
  previousCard:RelatedItem|null,
  nextCard:RelatedItem|null,
  relatedCards:RelatedItems|null,
  tags:Array<Tag>,
  tagsV2:Array<string>,
  setDetails:SetDetailsDto,
}

export interface PublicCardListDto {
  results:Array<PublicCardDto>,
}

export interface CardContent {
  description:Array<DescriptionClauses>
}

export interface DescriptionClauses {
  clauses:Array<string>,
}

// The card dto that a signed in user is allowed to see
export interface UserCardDto extends PublicCardDto {
  ebaySoldListingUrl:string|null,
  ebayOpenListingUrl:string|null,
}

export interface Content {
  type:'section'|'paragraph'|'text'|'bold'|'empty',
  children:Array<Content>|string|null,
}