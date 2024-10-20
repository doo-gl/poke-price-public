import {CardOwnershipDtoList} from "./CardOwnershipDto";
import {userContext} from "../../infrastructure/UserContext";
import {NotAuthorizedError} from "../../error/NotAuthorizedError";
import {cardOwnershipRetriever} from "./CardOwnershipRetriever";
import {cardOwnershipMapper} from "./CardOwnershipMapper";


const retrieveCardsOwnedByCallingUser = async (cardIds:Array<string>):Promise<CardOwnershipDtoList> => {
  const user = userContext.getUser();
  if (!user) {
    throw new NotAuthorizedError(`No user`);
  }
  const userId = user.id;
  const results = await cardOwnershipRetriever.retrieveCardsOwnedByUser(cardIds, userId);
  return {
    results: results.map(entity => cardOwnershipMapper.mapDto(entity)),
  }
}

export const cardOwnershipDtoRetriever = {
  retrieveCardsOwnedByCallingUser,
}