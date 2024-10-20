import {logger} from "firebase-functions";
import {NAMES} from "./AllPokemonNames";
import {toInputValueSet} from "../../tools/SetBuilder";


const findNameIterations = (cardNameParts:Array<string>):Array<string> => {
  if (cardNameParts.length === 0) {
    return [];
  }
  if (cardNameParts.length === 1) {
    return cardNameParts;
  }
  if (cardNameParts.length === 2) {
    return [cardNameParts[0], cardNameParts[1], `${cardNameParts[0]}-${cardNameParts[1]}`]
  }
  let results:Array<string> = [];
  results = results.concat(findNameIterations(cardNameParts.slice(1)));
  results = results.concat(findNameIterations(cardNameParts.slice(0, cardNameParts.length - 1)));
  return results;
}

const extract = (cardName:string):Array<string> => {
  if (!cardName) {
    return [];
  }
  const split = cardName.split('-');
  if (split.length === 0) {
    return []
  }
  if (split.length > 7) {
    logger.error(`Card name: ${cardName} is too long, skipping`);
    return [];
  }
  const iterations:Array<string> = findNameIterations(split);
  const uniqueIterations = toInputValueSet(iterations);
  const results: { [key:string]:string } = {};
  uniqueIterations.forEach(iteration => {
    const matchedName = NAMES[iteration];
    if (matchedName) {
      results[matchedName] = matchedName;
    }
  })
  return Object.keys(results);
}

export const pokemonNameExtractor = {
  extract,
}