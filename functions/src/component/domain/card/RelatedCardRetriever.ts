import {CardVariant, formatVariant} from "./CardEntity";
import {
  ItemEntity,
  itemRepository,
  itemUpdater,
  RelatedItem,
  RelatedItems,
  SingleCardItemDetails,
} from "../item/ItemEntity";
import {TotalCirculationValueTag} from "./query/ValueTagExtractor";
import {dedupe, dedupeInOrder} from "../../tools/ArrayDeduper";
import {flattenArray} from "../../tools/ArrayFlattener";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {cardImageToImageMapper} from "../item/CardImageToImageMapper";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {itemValueTagExtractor, TOTAL_CIRCULATION_SEARCH_TAG_KEY} from "../item/tag/ItemValueTagExtractor";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {relatedItemMapper} from "../item/RelatedItemMapper";
import {CARD_SET_SEARCH_TAG_KEY, extractCardNumber, POKEMON_SEARCH_TAG_KEY} from "../item/tag/PokemonCardTagExtractor";
import {keyValueToTag} from "../search-tag/SearchTagEntity";
import {convertEnumToKey} from "../../tools/KeyConverter";
import {NAME_SEARCH_TAG_KEY} from "../item/tag/ItemTagExtractor";
import {itemRetriever} from "../item/ItemRetriever";

const MAX_RELATED_ITEMS = 10;
const BY_CIRCULATION_DESC = comparatorBuilder.combineAll<ItemEntity>(
  comparatorBuilder.objectAttributeDESC(card => {
    return itemValueTagExtractor.calculateTotalCirculation(card.itemPrices)
  }),
  comparatorBuilder.objectAttributeASC(card => card.name),
  comparatorBuilder.objectAttributeASC(card => card._id.toString()),
)

interface SimilarQuery {
  filterTags:Array<string>
}

const mapToRelatedCard = (card:ItemEntity):RelatedItem => {
  if (card.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return relatedItemMapper.map(card)
  }
  const itemDetails = card.itemDetails as SingleCardItemDetails
  return {
    id: card.legacyId ?? card._id.toString(),
    name: card.displayName,
    longName: `${card.displayName} - ${extractCardNumber(itemDetails)}${itemDetails.variant === CardVariant.DEFAULT ? '' : ' - ' + formatVariant(itemDetails.variant)}`,
    slug: card.slug || card.legacyId || card._id.toString(),
    image: card.images,
  }
}

const queriesForSimilarPokemon = (card:ItemEntity):Array<SimilarQuery> => {
  if (card.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return []
  }
  const itemDetails = card.itemDetails as SingleCardItemDetails;
  if (!itemDetails.pokemon || itemDetails.pokemon.length === 0) {
    return []
  }
  return itemDetails.pokemon.map(pokemon => ({
    filterTags: [keyValueToTag(POKEMON_SEARCH_TAG_KEY, pokemon)],
  }))
}

const queriesForSameName = (card:ItemEntity):Array<SimilarQuery> => {
  return [{
    filterTags: [keyValueToTag(NAME_SEARCH_TAG_KEY, card.name)],
  }]
}

const queriesForSameSet = (card:ItemEntity):Array<SimilarQuery> => {
  if (card.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return []
  }
  const itemDetails = card.itemDetails as SingleCardItemDetails;
  return [{
    filterTags: [keyValueToTag(CARD_SET_SEARCH_TAG_KEY, itemDetails.set)],
  }]
}

const queryForCirculation = async (queryCard:ItemEntity, queries:Array<SimilarQuery>, circulation:TotalCirculationValueTag):Promise<Array<ItemEntity>> => {
  const queriesWithCirculation = queries.map(query => {
    const newQuery:SimilarQuery = {
      filterTags: query.filterTags.concat([keyValueToTag(TOTAL_CIRCULATION_SEARCH_TAG_KEY, convertEnumToKey(circulation))]),
    }
    return newQuery;
  })
  const results = await Promise.all(
    queriesWithCirculation.map(async query => {
      return itemRepository.getMany(
        {
          tags: {$all: query.filterTags},
        },
        { limit: MAX_RELATED_ITEMS }
      )
    })
  )
  const flattenedResults = dedupe(
    flattenArray(results),
    card => card._id.toString()
  )
    .filter(card => card._id.toString() !== queryCard._id.toString());
  return flattenedResults;
}

const queryByDecreasingCirculation = async (queryCard:ItemEntity, queries:Array<SimilarQuery>, limit:number):Promise<Array<ItemEntity>> => {
  if (limit <= 0) {
    return []
  }
  let cards = await queryForCirculation(queryCard, queries, TotalCirculationValueTag.VERY_HIGH_CIRCULATION);
  if (cards.length >= limit) {
    return cards;
  }
  cards = cards.concat(await queryForCirculation(queryCard, queries, TotalCirculationValueTag.HIGH_CIRCULATION))
  if (cards.length >= limit) {
    return cards;
  }
  cards = cards.concat(await queryForCirculation(queryCard, queries, TotalCirculationValueTag.MODERATE_CIRCULATION))
  return cards;
}

const retrieveForCard = async (card:ItemEntity):Promise<RelatedItems> => {
  // if card already has related items, don't recalculate
  if (card.relatedItems?.itemIds?.length > 0) {
    return card.relatedItems;
  }

  // find cards with similar name / pokemon first
  const similarNameAndPokemonCards = await queryByDecreasingCirculation(
    card,
    queriesForSameName(card).concat(queriesForSimilarPokemon(card)),
    MAX_RELATED_ITEMS
  );
  similarNameAndPokemonCards.sort(BY_CIRCULATION_DESC)

  // fill up the rest of the related items with cards from the same set
  const extraCardsNeeded = MAX_RELATED_ITEMS - similarNameAndPokemonCards.length;
  const sameSetCards = await queryByDecreasingCirculation(card, queriesForSameSet(card), extraCardsNeeded);
  sameSetCards.sort(BY_CIRCULATION_DESC)

  const allCards = dedupeInOrder(similarNameAndPokemonCards.concat(sameSetCards), c => c._id.toString())
  const relatedItems = allCards.slice(0, MAX_RELATED_ITEMS).map(similarCard => mapToRelatedCard(similarCard))
  const relatedItemIds = relatedItems.map(relatedItem => relatedItem.id)
  const relatedCards = {
    itemIds: relatedItemIds,
    items: relatedItems,
  };
  await itemUpdater.updateOnly(card._id, { relatedItems: relatedCards });
  return relatedCards;
}

const retrieveForCardId = async (itemId:string):Promise<RelatedItems> => {
  const card = await itemRetriever.retrieveByIdOrLegacyId(itemId);
  return retrieveForCard(card);
}

export const relatedCardRetriever = {
  retrieveForCard,
  mapToRelatedCard,
  retrieveForCardId,
}