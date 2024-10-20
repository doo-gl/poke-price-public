import {CardPriceSelectionEntity, cardPriceSelectionRepository, PriceType} from "./CardPriceSelectionEntity";
import {Create} from "../../../database/Entity";
import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";
import {byIdRetriever} from "../../../database/ByIdRetriever";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {batchIds} from "../../../database/BaseCrudRepository";
import {flattenArray} from "../../../tools/ArrayFlattener";
import {toInputValueMap} from "../../../tools/MapBuilder";


const retrievePreExisting = (create:Create<CardPriceSelectionEntity>):Promise<CardPriceSelectionEntity|null> => {
  return singleResultRepoQuerier.query(
    cardPriceSelectionRepository,
    [
      { name: "cardId", value: create.cardId },
      { name: "searchId", value: create.searchId },
      { name: "condition", value: create.condition },
      { name: "priceType", value: create.priceType },
      { name: "currencyCode", value: create.currencyCode },
    ],
    cardPriceSelectionRepository.collectionName
  )
}

const retrieveForCardId = (cardId:string):Promise<Array<CardPriceSelectionEntity>> => {
  return cardPriceSelectionRepository.getMany(
    [ { field: "cardId", operation: "==", value: cardId } ]
  )
}

const retrieveForCardIdAndPriceType = (cardId:string, priceType:PriceType):Promise<Array<CardPriceSelectionEntity>> => {
  return cardPriceSelectionRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
    { field: "priceType", operation: "==", value: priceType },
  ])
}

const retrieve = (id:string):Promise<CardPriceSelectionEntity> => {
  return byIdRetriever.retrieve(
    cardPriceSelectionRepository,
    id,
    cardPriceSelectionRepository.collectionName
  )
}

const retrieveOptional = (id:string):Promise<CardPriceSelectionEntity|null> => {
  return cardPriceSelectionRepository.getOne(id)
}

const retrieveSelectionsToReconcile = (limit:number):Promise<Array<CardPriceSelectionEntity>> => {
  return cardPriceSelectionRepository.getMany(
    [
      { field: "hasReconciled", operation: "==", value: false },
    ],
    {
      limit,
    }
  )
}

const retrieveByIds = (ids:Array<string>):Promise<Array<CardPriceSelectionEntity>> => {
  return cardPriceSelectionRepository.getManyById(ids)
}

const retrieveBySearchIds = async (searchIds:Array<string>):Promise<Array<CardPriceSelectionEntity>> => {
  const idBatches = batchIds(searchIds);
  const selections = flattenArray(await Promise.all(
    idBatches.map(batch => cardPriceSelectionRepository.getMany([
      { field: "searchId", operation: "in", value: batch },
    ]))
  ))
  const idToSelection = toInputValueMap(selections, value => value.id)
  return [...idToSelection.values()]
}

export const cardPriceSelectionRetriever = {
  retrievePreExisting,
  retrieveForCardId,
  retrieveForCardIdAndPriceType,
  retrieve,
  retrieveByIds,
  retrieveBySearchIds,
  retrieveSelectionsToReconcile,
  retrieveOptional,
}