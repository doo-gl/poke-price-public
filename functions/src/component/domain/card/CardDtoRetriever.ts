import {CardDto} from "./CardDto";
import {cardDtoMapper} from "./CardDtoMapper";
import {jsonToCsv} from "../../external-lib/JsonToCsv";
import {setRetriever} from "../set/SetRetriever";
import {SetEntity} from "../set/SetEntity";
import {Random} from "../../tools/Random";
import {NotFoundError} from "../../error/NotFoundError";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {ItemEntity} from "../item/ItemEntity";

export interface CardRequest {
  series:string,
  set:string,
  numberInSet:string,
  tags:Array<string>,
  ids:Array<string>,
  nextToken:string,
}

const retrieve = async (id:string):Promise<CardDto> => {
  const card = await cardItemRetriever.retrieve(id);
  return cardDtoMapper.mapItem(card);
}

const retrieveForSet = async (setId:string):Promise<Array<CardDto>> => {
  const set = await setRetriever.retrieve(setId);
  const cards = await cardItemRetriever.retrieveBySet(set.series, set.name);
  return cards.map(card => cardDtoMapper.mapItem(card));
}

const retrieveRandom = async ():Promise<CardDto> => {
  const allSets:Array<SetEntity> = await setRetriever.retrieveAll();
  if (allSets.length === 0) {
    throw new NotFoundError(`No Sets exist`);
  }
  const set:SetEntity = allSets[Random.integer(0, allSets.length)];
  const cards:Array<ItemEntity> = await cardItemRetriever.retrieveByUniqueSet({ series: set.series, set: set.name });
  if (cards.length === 0) {
    throw new NotFoundError(`No cards in series: ${set.series}, set: ${set.name}`);
  }
  const card:ItemEntity = cards[Random.integer(0, cards.length)];
  return cardDtoMapper.mapItem(card);
}

export const cardDtoRetriever = {
  retrieve,
  retrieveForSet,
  retrieveRandom,
}