import {PokemonTcgCard} from "../../../client/PokemonTcgApiClientV2";
import {cardItemRetriever} from "../../item/CardItemRetriever";
import {ItemEntity} from "../../item/ItemEntity";
import {CardVariant} from "../../card/CardEntity";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {logger} from "firebase-functions";
import {pokemonTcgApiPriceHistoryRetriever} from "./PokemonTcgApiPriceHistoryRetriever";
import {pokemonTcgApiPriceHistoryCreator, PokemonTcgApiPriceHistoryEntity} from "./PokemonTcgApiPriceHistoryEntity";
import {TimestampStatic} from "../../../external-lib/Firebase";
import moment from "moment";
import {priceHistoryUpdateHandler} from "../../item/price-history/PriceHistoryUpdateHandler";
import {Create} from "../../../database/Entity";

const findMatchingItem = async (pokemonTcgCard:PokemonTcgCard):Promise<ItemEntity|null> => {
  const items = await cardItemRetriever.retrieveByPokemonTcgId(pokemonTcgCard.id)
  const standardItems = items.filter(itm => itm.itemDetails?.variant === CardVariant.DEFAULT)
  standardItems.sort(comparatorBuilder.objectAttributeDESC(val => val._id.toString()))
  return standardItems.length > 0
    ? standardItems[0]
    : null
}

const hasAlreadyUpdated = (pokemonTcgCard:PokemonTcgCard, history:PokemonTcgApiPriceHistoryEntity):boolean => {
  const newTcgPlayerUpdateTime = moment(pokemonTcgCard.tcgplayer?.updatedAt ?? "1970/01/01", "YYYY/MM/DD")
  const currentTcgPlayerUpdateTime = moment(history.tcgPlayer?.updatedAt ?? "1970/01/01", "YYYY/MM/DD")
  const isNewTcgPlayerData = newTcgPlayerUpdateTime.isAfter(currentTcgPlayerUpdateTime)

  const newCardMarketUpdateTime = moment(pokemonTcgCard.cardmarket?.updatedAt ?? "1970/01/01", "YYYY/MM/DD")
  const currentCardMarketUpdateTime = moment(history.cardMarket?.updatedAt ?? "1970/01/01", "YYYY/MM/DD")
  const isNewCardMarketData = newCardMarketUpdateTime.isAfter(currentCardMarketUpdateTime)

  return !isNewTcgPlayerData && !isNewCardMarketData
}

const createHistory = async (pokemonTcgCard:PokemonTcgCard, item:ItemEntity) => {
  const create:Create<PokemonTcgApiPriceHistoryEntity> = {
    itemId: item._id.toString(),
    pokemonTcgApiId: pokemonTcgCard.id,
    pokemonTcgApiUrl: `https://api.pokemontcg.io/v2/cards/${pokemonTcgCard.id}`,
    timestamp: TimestampStatic.now(),
    cardMarket: pokemonTcgCard.cardmarket ?? null,
    tcgPlayer: pokemonTcgCard.tcgplayer ?? null,
  }
  await pokemonTcgApiPriceHistoryCreator.create(create)
  await priceHistoryUpdateHandler.onNewTcgApiHistory(item, [create])
}

const updateHistory = async (pokemonTcgCard:PokemonTcgCard, item:ItemEntity, history:PokemonTcgApiPriceHistoryEntity) => {
  if (hasAlreadyUpdated(pokemonTcgCard, history)) {
    // logger.info(`Price history for item: ${history.itemId} (${history.pokemonTcgApiId}) already includes most recent update from the API`)
    return
  }

  const create:Create<PokemonTcgApiPriceHistoryEntity> = {
    itemId: history.itemId,
    pokemonTcgApiId: history.pokemonTcgApiId,
    timestamp: TimestampStatic.now(),
    pokemonTcgApiUrl: history.pokemonTcgApiUrl,
    cardMarket: pokemonTcgCard.cardmarket ?? null,
    tcgPlayer: pokemonTcgCard.tcgplayer ?? null,
  }
  await pokemonTcgApiPriceHistoryCreator.create(create)
  await priceHistoryUpdateHandler.onNewTcgApiHistory(item, [create])
}

const record = async (pokemonTcgCard:PokemonTcgCard):Promise<void> => {

  const item = await findMatchingItem(pokemonTcgCard)
  if (!item) {
    // logger.warn(`Trying to add price history for ${pokemonTcgCard.id}, but no matching item found`)
    return
  }

  const mostRecentPriceHistory = await pokemonTcgApiPriceHistoryRetriever.retrieveMostRecentForItemId(item._id.toString())
  if (mostRecentPriceHistory) {
    await updateHistory(pokemonTcgCard, item, mostRecentPriceHistory)
  } else {
    await createHistory(pokemonTcgCard, item)
  }
}

export const pokemonTcgApiPriceRecorder = {
  record,
}