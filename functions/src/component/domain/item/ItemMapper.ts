import {CardItemDetails, ItemDto} from "./ItemDto";
import {toSet} from "../../tools/SetBuilder";
import {setRetriever} from "../set/SetRetriever";
import {toInputValueMap} from "../../tools/MapBuilder";
import {SetEntity} from "../set/SetEntity";
import {ItemEntity, ItemType, legacyIdOrFallback} from "./ItemEntity";
import {toCard} from "./CardItem";
import {itemPriceQuerier} from "./ItemPriceQuerier";


const mapCards = async (cards:Array<ItemEntity>):Promise<Array<ItemDto>> => {
  const setIds = toSet(cards, card => toCard(card)?.setId ?? '')
  const sets = await setRetriever.retrieveMany([...setIds.values()].filter(id => id.length > 0))
  const setIdToSet = toInputValueMap(sets, set => set.id)
  const items:Array<ItemDto> = [];
  cards.forEach(card => {
    const set = setIdToSet.get(toCard(card)?.setId ?? '')
    if (!set) {
      return
    }
    const item = mapCard(card, set)
    if (!item) {
      return;
    }
    items.push(item)
  })
  return items
}

const mapCard = (card:ItemEntity, set:SetEntity):ItemDto|null => {
  const cardDetails = toCard(card)
  if (!cardDetails) {
    return null;
  }
  const itemDetails:CardItemDetails = {
    cardNumber: cardDetails.cardNumber,
    setNumber: set.displaySetNumber,
    logoUrl: set.symbolUrl,
  }

  return {
    itemId: legacyIdOrFallback(card),
    image: card.images.images[0],
    name: card.displayName,
    price: itemPriceQuerier.pokePrice(card)?.price ?? null,
    itemType: ItemType.SINGLE_CARD,
    itemDetails,
  }
}

export const itemMapper = {
  mapCards,
}