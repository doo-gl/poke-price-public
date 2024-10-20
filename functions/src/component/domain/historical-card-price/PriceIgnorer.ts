import {historicalCardPriceRetriever} from "./HistoricalCardPriceRetriever";
import {HistoricalCardPriceEntity, State} from "./HistoricalCardPriceEntity";
import {Update} from "../../database/Entity";
import {historicalCardPriceUpdater} from "./HistoricalCardPriceUpdater";
import {userContext} from "../../infrastructure/UserContext";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {cardStatsRetrieverV2} from "../stats/card-v2/CardStatsRetriever";
import {cardStatsCalculator} from "../stats/card-v2/CardStatsCalculator";


const ignore = async (priceId:string) => {
  const callingUser = userContext.getAdminUser()
  if (!callingUser) {
    throw new InvalidArgumentError(`No calling user`)
  }
  const price = await historicalCardPriceRetriever.retrieve(priceId);

  await historicalCardPriceUpdater.update(price.id, {
    state: State.INACTIVE,
    deactivationDetails: {
      userId: callingUser.id,
      reason: 'price has been ignored',
    },
    selectionIds: [],
  })
  const priceStats = await cardStatsRetrieverV2.retrieveByItemId(price.id)
  await Promise.all(
    priceStats.map(stat => cardStatsCalculator.calculateForStats(stat))
  )
}

export const priceIgnorer = {
  ignore,
}