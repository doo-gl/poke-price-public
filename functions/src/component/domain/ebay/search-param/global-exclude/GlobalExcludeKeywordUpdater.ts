import {GlobalExcludeKeywordEntity} from "./GlobalExcludeKeywordEntity";
import {globalExcludeKeywordRetriever} from "./GlobalExcludeKeywordRetriever";
import {baseGlobalExcludeKeywordUpdater} from "./GlobalExcludeKeywordRepository";
import {setRetriever} from "../../../set/SetRetriever";
import {toInputValueMap} from "../../../../tools/MapBuilder";
import {SetEntity} from "../../../set/SetEntity";
import {BatchUpdate} from "../../../../database/BaseCrudRepository";
import {TempKeywordUrlEntity} from "../temp-keyword-url/TempKeywordUrlEntity";
import {tempKeywordUrlRepository} from "../temp-keyword-url/TempKeywordUrlRepository";
import {searchKeywordCalculator} from "../SearchKeywordCalculator";
import {ebayOpenListingUrlCreator} from "../../card-price/open-listing-retrieval/EbayOpenListingUrlCreator";
import {NotFoundError} from "../../../../error/NotFoundError";
import {lodash} from "../../../../external-lib/Lodash";
import {cardItemRetriever} from "../../../item/CardItemRetriever";
import {itemRetriever} from "../../../item/ItemRetriever";
import {ItemEntity, legacyIdOrFallback} from "../../../item/ItemEntity";
import {toCard} from "../../../item/CardItem";


const update = async (excludes:Array<string>):Promise<GlobalExcludeKeywordEntity> => {

  const global = await globalExcludeKeywordRetriever.retrieve();
  const decodedExcludes = excludes.map(exclude => decodeURIComponent(exclude));
  const updatedGlobal = await baseGlobalExcludeKeywordUpdater.update(global.id, { excludes: decodedExcludes });
  if (!updatedGlobal) {
    throw new NotFoundError(`Failed to find global keyword excludes`)
  }
  const sets = await setRetriever.retrieveAll();
  const setIdToSet = toInputValueMap<string, SetEntity>(sets, set => set.id);
  await tempKeywordUrlRepository.iterator()
    .sort([])
    .batchSize(100)
    .iterateBatch(async (tempUrls:Array<TempKeywordUrlEntity>) => {
      const cardIds = tempUrls.map(tempUrl => tempUrl.cardId);
      const cards = await itemRetriever.retrieveManyByLegacyId(cardIds);
      const cardIdToCard = toInputValueMap<string, ItemEntity>(cards, card => legacyIdOrFallback(card));
      const updates:Array<BatchUpdate<TempKeywordUrlEntity>> = [];
      tempUrls.map(tempUrl => {
        const card = cardIdToCard.get(tempUrl.cardId);
        if (!card) {
          return;
        }
        const set = setIdToSet.get(toCard(card)?.setId ?? '');
        if (!set) {
          return;
        }
        const searchParams = searchKeywordCalculator.calculateFromEntities(card, set, updatedGlobal);
        const openListingUrl = ebayOpenListingUrlCreator.create(searchParams);
        if (lodash.isNotEqual(searchParams, tempUrl.searchParams) || lodash.isNotEqual(openListingUrl, tempUrl.openListingUrl)) {
          updates.push({ id: tempUrl.id, update: { searchParams, openListingUrl } })
        }
      })
      await tempKeywordUrlRepository.batchUpdate(updates);
      return false;
    })
  return updatedGlobal;
}

export const globalExcludeKeywordUpdater = {
  update,
}