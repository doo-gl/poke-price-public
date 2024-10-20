import {MarketplaceListingEntity, marketplaceListingRepository} from "./MarketplaceListingEntity";
import {NotFoundError} from "../../error/NotFoundError";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";

const retrieveOptionalForListingId = async (listingId:string):Promise<MarketplaceListingEntity|null> => {
  const listings = await marketplaceListingRepository.getMany({
    listingId,
  })
  if (listings.length === 0) {
    return null
  }
  listings.sort(comparatorBuilder.combineAll(
    comparatorBuilder.objectAttributeASC(value => value.dateCreated.getTime()),
    comparatorBuilder.objectAttributeASC(value => value._id.toString()),
  ))
  return listings[0]
}

const retrieveForListingId = async (listingId:string):Promise<MarketplaceListingEntity> => {
  const listing = await retrieveOptionalForListingId(listingId)
  if (!listing) {
    throw new NotFoundError(`Failed to find listing for id: ${listingId}`)
  }
  return listing
}

const retrieveForListingIds = (listingIds:Array<string>):Promise<Array<MarketplaceListingEntity>> => {
  return marketplaceListingRepository.getMany({
    listingId: { $in: listingIds },
  })
}

const existsForTag = async (tag:string):Promise<boolean> => {
  const results = await marketplaceListingRepository.getMany(
    {
      tags: tag,
    },
    {
      limit: 1,
    }
  )
  return results.length > 0;
}

const retrieveByMostRecentlyUpdatedAsc = (limit:number, afterDate:Date):Promise<Array<MarketplaceListingEntity>> => {
  return marketplaceListingRepository.getMany(
    { mostRecentUpdate: {$gte: afterDate} },
    {limit, sort: {'mostRecentUpdate': 1}}
  )
}

export const marketplaceListingRetriever = {
  retrieveForListingIds,
  retrieveForListingId,
  retrieveOptionalForListingId,
  existsForTag,
  retrieveByMostRecentlyUpdatedAsc,
}