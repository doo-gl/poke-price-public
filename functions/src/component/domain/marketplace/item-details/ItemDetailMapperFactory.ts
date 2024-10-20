import {ItemDetailMapper, ItemDetails} from "../MarketplaceListingEntity";
import {InvalidArgumentError} from "../../../error/InvalidArgumentError";


const build = <TYPE extends string, DETAILS extends ItemDetails> (type:TYPE):ItemDetailMapper<TYPE, DETAILS> => {
  return {
    type: () => type,
    details: value => {
      if (value.itemType !== type) {
        throw new InvalidArgumentError(`Unexpected item type: ${value.itemType}, expected: ${type}`);
      }
      return value.itemDetails as DETAILS; // should probably do some form of validation
    },
    optionalDetails: value => {
      if (value.itemType !== type) {
        return null;
      }
      return value.itemDetails as DETAILS; // should probably do some form of validation
    },
  }
}

export const itemDetailMapperFactory = {
  build,
}