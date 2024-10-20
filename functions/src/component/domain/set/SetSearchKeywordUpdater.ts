import {SearchKeywords} from "../card/CardEntity";
import {SetEntity} from "./SetEntity";
import {setUpdater} from "./SetUpdater";
import {ConcurrentPromiseQueue} from "../../tools/ConcurrentPromiseQueue";
import {cardSearchKeywordUpdater} from "../card/CardSearchKeywordUpdater";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {legacyIdOrFallback} from "../item/ItemEntity";

const queue = new ConcurrentPromiseQueue(10);

const updateUrls = async (set:SetEntity):Promise<void> => {
  const cards = await cardItemRetriever.retrieveBySetId(set.id);
  await Promise.all(cards.map(card => queue.addPromise(
    () => cardSearchKeywordUpdater.updateSearchParams(legacyIdOrFallback(card))
  )));
}

const update = async (setId:string, searchKeywords:SearchKeywords):Promise<SetEntity> => {
  const set = await setUpdater.update(setId, { searchKeywords });
  await updateUrls(set)
  return set;
}

export const setSearchKeywordUpdater = {
  update,
}