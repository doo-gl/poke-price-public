import {Entity} from "../../database/Entity";


export interface CardCollectionOwnershipEntity extends Entity {
  cardCollectionId:string,
  userId:string,
  ownedCardIds:Array<string>,
}