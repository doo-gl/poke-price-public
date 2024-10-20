import {CardPriceData} from "./CardPriceData";
import {tcgPlayerHtmlMarketDataReader} from "./TcgPlayerHtmlMarketDataReader";
import {CardVariant} from "../card/CardEntity";
import {CardDataSource} from "../card/CardDataSource";
import {PriceDataType} from "../historical-card-price/PriceDataType";
import {
  CreateHistoricalCardPriceEntity,
  HistoricalCardPriceEntity,
  State,
} from "../historical-card-price/HistoricalCardPriceEntity";
import {logger} from "firebase-functions";
import {momentToTimestamp} from "../../tools/TimeConverter";
import {handleAllErrors} from "../../tools/AllPromiseHandler";
import {removeNulls} from "../../tools/ArrayNullRemover";
import {historicalCardPriceCreator} from "../historical-card-price/HistoricalCardPriceCreator";
import {CardCondition} from "../historical-card-price/CardCondition";
import {ItemEntity, legacyIdOrFallback} from "../item/ItemEntity";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {toCard} from "../item/CardItem";

const saveCardData = async (
  cardPriceData:CardPriceData,
  cardNumberToCard:Map<string, ItemEntity>
) :Promise<HistoricalCardPriceEntity|null> => {
  const cardEntity = cardNumberToCard.get(cardPriceData.setNumber.toLowerCase());
  if (!cardEntity) {
    logger.warn(
      `Failed to find card entity with series: ${cardPriceData.series}, set: ${cardPriceData.set}, number: ${cardPriceData.setNumber}`
    )
    return Promise.resolve(null);
  }
  const createHistoricalCardPrice:CreateHistoricalCardPriceEntity = {
    timestamp: momentToTimestamp(cardPriceData.timestamp),
    cardId: legacyIdOrFallback(cardEntity),
    priceDataType: PriceDataType.LISTING_PRICE,
    sourceType: CardDataSource.TCG_PLAYER,
    sourceId: null,
    sourceDetails: cardPriceData,
    currencyAmount: cardPriceData.price,
    searchIds: [],
    selectionIds: [],
    condition: CardCondition.NEAR_MINT,
    state: State.ACTIVE,
    deactivationDetails: null,
  };
  const newPrice = await historicalCardPriceCreator.create(createHistoricalCardPrice);
  return newPrice;
}

const source = async (series:string, set:string):Promise<Array<HistoricalCardPriceEntity>> => {
  const cardData:Array<CardPriceData> = await tcgPlayerHtmlMarketDataReader.getMarketData(series, set);
  const cardsInSet:Array<ItemEntity> = await cardItemRetriever.retrieveBySeriesAndSetAndVariant(series, set, CardVariant.DEFAULT);
  const cardNumberToCard:Map<string, ItemEntity> = new Map<string, ItemEntity>();
  cardsInSet.forEach(card => cardNumberToCard.set(toCard(card)?.cardNumber?.toLowerCase() ?? '', card));

  const savedPriceData:Array<HistoricalCardPriceEntity|null> = await handleAllErrors(
    cardData.map(cardPriceData => saveCardData(cardPriceData, cardNumberToCard)),
    `Failed to find card price data`,
  );
  const deNulledPriceData:Array<HistoricalCardPriceEntity> = removeNulls(savedPriceData);
  logger.info(`Sourced ${deNulledPriceData.length} price datas from Tcg Player for series: ${series}, set: ${set}`);
  return Promise.resolve(deNulledPriceData);
}

export const tcgPlayerMarketDataSourcer = {
  source,
}