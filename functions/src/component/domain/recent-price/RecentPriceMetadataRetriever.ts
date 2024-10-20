import {RecentPriceMetadataEntity, recentPriceMetadataRepository} from "./RecentPriceMetadataEntity";
import {SortOrder} from "../../database/BaseCrudRepository";
import {Moment} from "moment/moment";
import {momentToTimestamp} from "../../tools/TimeConverter";


const retrieveByRevealingTo = (timestamp:Moment):Promise<Array<RecentPriceMetadataEntity>> => {
  return recentPriceMetadataRepository.getMany(
    [{ field: "revealingTo", operation: ">=", value: momentToTimestamp(timestamp) }],
    {
      limit: 100,
      sort: [{ field: "revealingTo", order: SortOrder.ASC }],
    }
  )
}

const retrieveMostRecent = async ():Promise<RecentPriceMetadataEntity|null> => {
  const metadata = await recentPriceMetadataRepository.getMany(
    [],
    {
      limit: 1,
      sort: [{ field: "revealingTo", order: SortOrder.DESC }],
    }
  )
  return metadata.length > 0 ? metadata[0] : null
}

export const recentPriceMetadataRetriever = {
  retrieveByRevealingTo,
  retrieveMostRecent,
}