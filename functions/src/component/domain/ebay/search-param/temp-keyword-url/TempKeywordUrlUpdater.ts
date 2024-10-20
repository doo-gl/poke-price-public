import {SearchParams} from "../EbayCardSearchParamEntity";
import {TempKeywordUrlEntity} from "./TempKeywordUrlEntity";
import {baseTempKeywordUrlCreator, baseTempKeywordUrlUpdater} from "./TempKeywordUrlRepository";
import {ebayOpenListingUrlCreator} from "../../card-price/open-listing-retrieval/EbayOpenListingUrlCreator";
import {tempKeywordUrlRetriever} from "./TempKeywordUrlRetriever";


const update = async (cardId:string, searchParams:SearchParams, isUrlReviewed = false):Promise<TempKeywordUrlEntity> => {
  const openListingUrl = ebayOpenListingUrlCreator.create(searchParams);
  const tempKeyWordUrl = await tempKeywordUrlRetriever.retrieveByCardId(cardId);
  if (!tempKeyWordUrl) {
    return baseTempKeywordUrlCreator.create({
      cardId,
      searchParams,
      openListingUrl,
      isUrlReviewed,
    });
  } else {
    return baseTempKeywordUrlUpdater.update(tempKeyWordUrl.id, { searchParams, openListingUrl });
  }
}

export const tempKeywordUrlUpdater = {
  update,
}