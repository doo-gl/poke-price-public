import {CardOwnershipEntity} from "./CardOwnershipEntity";
import {CardOwnershipDto} from "./CardOwnershipDto";


const mapDto = (cardOwnership:CardOwnershipEntity):CardOwnershipDto => {
  return {
    cardId: cardOwnership.cardId,
    userId: cardOwnership.userId,
    ownershipType: cardOwnership.ownershipType,
    inventoryItemIds: cardOwnership.inventoryItemIds ?? [],
  }
}

export const cardOwnershipMapper = {
  mapDto,
}