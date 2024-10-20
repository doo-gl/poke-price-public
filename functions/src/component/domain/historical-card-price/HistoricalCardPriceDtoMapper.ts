import {HistoricalCardPriceEntity} from "./HistoricalCardPriceEntity";
import {HistoricalCardPriceDto} from "./HistoricalCardPriceDto";
import {CardDataSource} from "../card/CardDataSource";
import {entityDtoMapper} from "../EntityDtoMapper";
import {timestampToMoment} from "../../tools/TimeConverter";


const mapSourceDetails = (source:CardDataSource, details:object):object => {
  if (source === CardDataSource.EBAY_CARD_LISTING) {
    return details;
  }
  if (source === CardDataSource.TCG_PLAYER) {
    return details;
  }
  return {};
}

const mapDto = (entity:HistoricalCardPriceEntity):HistoricalCardPriceDto => {
  return {
    ...entityDtoMapper.map(entity),
    cardId: entity.cardId,
    currencyAmount: entity.currencyAmount,
    priceDataType: entity.priceDataType,
    searchIds: entity.searchIds,
    sourceDetails: mapSourceDetails(entity.sourceType, entity.sourceDetails),
    sourceType: entity.sourceType,
    sourceId: entity.sourceId,
    timestamp: timestampToMoment(entity.timestamp),
    selectionIds: entity.selectionIds,
    state: entity.state,
  }
}

export const historicalCardPriceDtoMapper = {
  mapDto,
}