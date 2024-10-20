import {Set} from "pokemon-tcg-sdk-typescript/dist/classes/set";
import {PokemonTCG} from "pokemon-tcg-sdk-typescript";
import {Card} from "pokemon-tcg-sdk-typescript/dist/classes/card";
import {logger} from "firebase-functions";

const checkNullability = (obj:any, fieldNames:Array<string>):void => {
  const nullFields = fieldNames
    .map(fieldName => obj[fieldName] === undefined || obj[fieldName] === null ? fieldName : null)
    .filter(fieldName => fieldName !== null);
  if (nullFields.length > 0) {
    logger.error(`Unexpected null fields on object. Fields: ${nullFields.join(',')}`, obj);
  }
}

const checkCardNullability = (card:Card):void => {
  checkNullability(
    card,
    [
      'id',
      'imageUrl',
      'imageUrlHiRes',
      'name',
      'number',
      'series',
      'set',
      'setCode',
      'subtype',
      'supertype',
    ]
  )
}

const checkSetNullability = (set:Set):void => {
  checkNullability(
    set,
    [
      'code',
      'logoUrl',
      'name',
      'releaseDate',
      'series',
      'symbolUrl',
      'totalCards',
      'updatedAt',
    ]
  )
}

const getCardsInSet = async (set:Set):Promise<Array<Card>> => {
  // @ts-ignore
  return PokemonTCG.Card.where([
    {name: "set", value: set.name},
    {name: "pageSize", value: 500}, // Assumption that no sets contain more than 500 cards
  ])
    .then((cards:any) => {
      cards.forEach((card:any) => checkCardNullability(card));
      return cards;
    })
};

const getAllSets = async ():Promise<Array<Set>> => {
  // @ts-ignore
  return PokemonTCG.Set.where([
    {name: "pageSize", value: 500},
  ])
    .then((sets:any) => {
      sets.forEach((set:any) => checkSetNullability(set));
      return sets;
    })
};

const getSet = async (series:string, setName:string):Promise<Set|null> => {
  // @ts-ignore
  const sets:any = await PokemonTCG.Set.where([
    {name: "series", value: series},
    {name: "name", value: setName},
  ])
  if (!sets || sets.length === 0) {
    return Promise.resolve(null);
  }
  if (sets.length > 1) {
    logger.warn(
      `Found more than one set for series: ${series}, set: ${setName}, actual:
      ${sets.map((s:any) => `${s.series}|${s.name}|${s.code}`).join(',')}
      Only the first set will be used.`
    );
  }
  const set = sets[0];
  checkSetNullability(set);
  return Promise.resolve(set);
}

export const pokemonTcgApiClient = {
  getCardsInSet,
  getSet,
  getAllSets,
}