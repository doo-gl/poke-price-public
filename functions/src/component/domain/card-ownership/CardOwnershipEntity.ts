import {Entity} from "../../database/Entity";

export enum OwnershipType {
  OWNED = 'OWNED',
}

export interface CardOwnershipEntity extends Entity {
  cardId:string,
  userId:string,
  ownershipType:OwnershipType,
  inventoryItemIds:Array<string>,
}