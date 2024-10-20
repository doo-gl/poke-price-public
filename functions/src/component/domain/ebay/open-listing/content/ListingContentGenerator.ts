import {EbayOpenListingEntity, ListingState} from "../EbayOpenListingEntity";
import {ContentItem} from "./ContentItem";
import {openListingContentGenerator} from "./OpenListingContentGenerator";
import {endedListingContentGenerator} from "./EndedListingContentGenerator";


const generate = (listing:EbayOpenListingEntity):ContentItem => {
  if (listing.state === ListingState.OPEN) {
    return openListingContentGenerator.generate(listing)
  }
  return endedListingContentGenerator.generate(listing)
}

export const listingContentGenerator = {
  generate,
}