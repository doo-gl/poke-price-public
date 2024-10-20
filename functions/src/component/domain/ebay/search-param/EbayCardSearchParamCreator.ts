import {EbayCardSearchParamEntity} from "./EbayCardSearchParamEntity";
import {Create, Update} from "../../../database/Entity";
import {logger} from "firebase-functions";
import {ebayCardSearchParamRepository} from "./EbayCardSearchParamRepository";
import {InvalidArgumentError} from "../../../error/InvalidArgumentError";
import {cardPriceStatsCreator} from "../../stats/card/CardPriceStatsCreator";
import {lodash} from "../../../external-lib/Lodash";
import {ebaySearchParamUpdater} from "./EbayCardSearchParamUpdater";
import {ebaySearchUrlCreator} from "./EbaySearchUrlCreator";
import {CreateSearchParamRequest, createSearchParamsSchema} from "./EbayCardSearchParamEndpoints";
import {toSet} from "../../../tools/SetBuilder";
import {intersection} from "../../../tools/SetOperations";
import {ebaySearchParamRetriever} from "./EbayCardSearchParamRetriever";
import {jsonValidator} from "../../../tools/JsonValidator";
import {searchKeywordCalculator} from "./SearchKeywordCalculator";
import {cardPriceSelectionSearchUpdater} from "../../stats/card-v2/CardPriceSelectionSearchUpdater";
import {TimestampStatic} from "../../../external-lib/Firebase";
import {cardItemRetriever} from "../../item/CardItemRetriever";
import {legacyIdOrFallback} from "../../item/ItemEntity";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../../marketplace/item-details/SinglePokemonCardItemDetails";

const validate = async (newSearchParams:Create<EbayCardSearchParamEntity>):Promise<void> => {
  if (!Array.isArray(newSearchParams.includeKeywords)) {
    throw new InvalidArgumentError(`Expected includeKeywords to be an array`);
  }
  if (!Array.isArray(newSearchParams.excludeKeywords)) {
    throw new InvalidArgumentError(`Expected excludeKeywords to be an array`);
  }
}

const areParamsTheSame = (newSearchParams:Create<EbayCardSearchParamEntity>, preExistingSearchParams:EbayCardSearchParamEntity):boolean => {
  const includeParamsAreEqual = lodash.areArraysEqual(newSearchParams.includeKeywords, preExistingSearchParams.includeKeywords);
  const excludeParamsAreEqual = lodash.areArraysEqual(newSearchParams.excludeKeywords, preExistingSearchParams.excludeKeywords);
  return includeParamsAreEqual && excludeParamsAreEqual;
}

const removeRepeatParams = (newSearchParams:Create<EbayCardSearchParamEntity>):Create<EbayCardSearchParamEntity> => {
  const includes = toSet(newSearchParams.includeKeywords, param => param.toLowerCase());
  const excludes = toSet(newSearchParams.excludeKeywords, param => param.toLowerCase());

  const commonKeywords = intersection(includes, excludes);
  const excludesWithoutCommonKeywords = newSearchParams.excludeKeywords.filter(exclude => !commonKeywords.has(exclude.toLowerCase()))
  newSearchParams.excludeKeywords = excludesWithoutCommonKeywords;
  return newSearchParams;
}

const updateIfNeeded = (newSearchParams:Create<EbayCardSearchParamEntity>, preExistingSearchParams:EbayCardSearchParamEntity):Promise<EbayCardSearchParamEntity> => {

  if (areParamsTheSame(newSearchParams, preExistingSearchParams)) {
    logger.info(`Found pre-existing search params for card id: ${newSearchParams.cardId}, with the same params, skipping`);
    return Promise.resolve(preExistingSearchParams);
  }
  const update:Update<EbayCardSearchParamEntity> = {
    includeKeywords: newSearchParams.includeKeywords,
    excludeKeywords: newSearchParams.excludeKeywords,
  };
  return ebaySearchParamUpdater.update(preExistingSearchParams.id, update);
}

const createSearchParams = async (searchParamRequest:Create<EbayCardSearchParamEntity>):Promise<EbayCardSearchParamEntity> => {
  await validate(searchParamRequest);
  const newSearchParams = removeRepeatParams(searchParamRequest);

  const preExistingSearchParams:Array<EbayCardSearchParamEntity> = await ebaySearchParamRetriever.retrieveSearchParamsForCardId(searchParamRequest.cardId);
  if (preExistingSearchParams && preExistingSearchParams.length > 0) {

    if (preExistingSearchParams.length === 1 && areParamsTheSame(newSearchParams, preExistingSearchParams[0])) {
      logger.info(`Found pre-existing search params for card id: ${newSearchParams.cardId}, with the same params, skipping`);
      return preExistingSearchParams[0];
    }
    // new params are different from pre-existing
    if (newSearchParams.active) {
      logger.info(`Found pre-existing search params for card id: ${newSearchParams.cardId}, with different params, it will be made inactive in favour of the new params`);
      const ids = preExistingSearchParams.map(param => param.id);
      await ebaySearchParamUpdater.batchUpdate(ids, { active: false, backfillTime: null });
    }
  }

  logger.info(`Creating ebay card search params for card id: ${newSearchParams.cardId}`);
  const createdSearchParams = await ebayCardSearchParamRepository.create(newSearchParams);
  logger.info(`Created ebay card search params with id: ${createdSearchParams.id} for card id: ${createdSearchParams.cardId}`);
  return createdSearchParams;
}

const create = async (request:CreateSearchParamRequest):Promise<EbayCardSearchParamEntity> => {
  const card = await cardItemRetriever.retrieve(request.cardId)
  const searchUrl = ebaySearchUrlCreator.create(request);
  const newSearchParams:Create<EbayCardSearchParamEntity> = {
    cardId: legacyIdOrFallback(card),
    itemId: card._id.toString(),
    searchUrl,
    includeKeywords: request.includeKeywords,
    excludeKeywords: request.excludeKeywords,
    active: true,
    mostRecentSearchTime: null,
    lastReconciled: TimestampStatic.fromMillis(0),
  }
  const createdSearchParams = await createSearchParams(newSearchParams);
  await cardPriceSelectionSearchUpdater.updateSelectionsForCardId(legacyIdOrFallback(card));
  return createdSearchParams;
}

const createFromDetails = (details:any):Promise<EbayCardSearchParamEntity> => {
  const request = jsonValidator.validate(details, createSearchParamsSchema);
  return create(request);
}

const createFromItemKeywords = async (itemId:string):Promise<EbayCardSearchParamEntity> => {
  const searchParams = await searchKeywordCalculator.calculate(itemId);
  return create({
    cardId: itemId,
    ...searchParams,
  })
}

const getOrCreateSearchParams = async (itemId:string):Promise<EbayCardSearchParamEntity> => {
  const searchParams = await ebaySearchParamRetriever.retrieveSearchParamsForCardId(itemId);
  if (searchParams.length === 0) {
    return await createFromItemKeywords(itemId);
  }
  return searchParams[0];
}

export const ebayCardSearchParamCreator = {
  create,
  createFromDetails,
  createFromItemKeywords,
  createSearchParams,
  getOrCreateSearchParams,
}