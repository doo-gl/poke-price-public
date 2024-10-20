import {OwnershipType} from "./CardOwnershipEntity";


export interface CardOwnershipDto {
  cardId:string,
  userId:string,
  ownershipType:OwnershipType,
  inventoryItemIds:Array<string>,
}

export interface CardOwnershipDtoList {
  results:Array<CardOwnershipDto>
}