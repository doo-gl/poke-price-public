import {CardEntity} from "../CardEntity";
import {CardRequest} from "../PublicCardDtoRetrieverV2";
import {cardQueryDetailBuilder} from "../query/CardQueryDetailBuilder";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";


const generateSuggestions = (cards:Array<CardEntity>, request:CardRequest):Array<{key:string, value:string}> => {
  // read through cards, create map of key|value => count
  // filter out entries that are in the request
  // return the top 5 pairs that have count below the number of cards

  const tagToCount = new Map<string, number>();
  const add = (tag:string) => {
    const count = tagToCount.get(tag) ?? 0;
    tagToCount.set(tag, count + 1)
  }
  const filter = (key:string, value:string) => {
    // @ts-ignore
    const requestValue = request[key];
    if (typeof requestValue === 'string' && requestValue === value) {
      return true
    }
    if (Array.isArray(requestValue) && requestValue.find(val => val === value)) {
      return true
    }
    return false;
  }

  cards.forEach(card => {
    const cardTags = cardQueryDetailBuilder.calculateQueryTags(card);
    Object.entries(cardTags).forEach(entry => {
      const key = entry[0];
      const value = entry[1];
      if (typeof value === 'string') {
        if (filter(key, value)) {
          return;
        }
        add(`${key}|${value}`)
      } else if (Array.isArray(value)) {
        value.forEach(nestedValue => {
          if (filter(key, nestedValue)) {
            return;
          }
          add(`${key}|${nestedValue}`)
        })
      }
    })
  })

  const tagsWithCount:Array<{tag:string, count:number}> = [...tagToCount.entries()].map(entry => ({tag: entry[0], count: entry[1]}))
  const sortedTags = tagsWithCount.sort(
    comparatorBuilder.combineAll<{tag:string, count:number}>(
      comparatorBuilder.objectAttributeDESC(value => value.count),
      comparatorBuilder.objectAttributeASC(value => value.tag),
    )
  )
    .filter(tag => tag.count < cards.length);

  return sortedTags.slice(0, 5)
    .map(tag => {
      const split = tag.tag.split('|');
      return {
        key: split[0],
        value: split[1],
      }
    })
}

export const cardTagSuggester = {
  generateSuggestions,
}