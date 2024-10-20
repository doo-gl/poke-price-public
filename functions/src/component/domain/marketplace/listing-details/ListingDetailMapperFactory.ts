import {ListingDetailMapper, ListingDetails} from "../MarketplaceListingEntity";
import {InvalidArgumentError} from "../../../error/InvalidArgumentError";


const build = <TYPE extends string, DETAILS extends ListingDetails> (type:TYPE):ListingDetailMapper<TYPE, DETAILS> => {
  return {
    type: () => type,
    details: value => {
      if (value.listingType !== type) {
        throw new InvalidArgumentError(`Unexpected listing type: ${value.listingType}, expected: ${type}`);
      }
      return value.listingDetails as DETAILS; // should probably do some form of validation
    },
    optionalDetails: value => {
      if (value.listingType !== type) {
        return null;
      }
      return value.listingDetails as DETAILS; // should probably do some form of validation
    },
  }
}

export const listingDetailMapperFactory = {
  build,
}