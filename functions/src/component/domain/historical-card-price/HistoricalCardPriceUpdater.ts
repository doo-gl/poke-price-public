import {historicalCardPriceRepository} from "./HistoricalCardPriceRepository";
import {entityUpdaterFactory} from "../../database/EntityUpdaterFactory";


export const historicalCardPriceUpdater = entityUpdaterFactory.build(historicalCardPriceRepository, historicalCardPriceRepository.collectionName)