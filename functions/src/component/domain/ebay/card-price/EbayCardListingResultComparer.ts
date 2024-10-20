import {EbayCardListing, EbayCardListingResult} from "./EbayCardListingSearcher";
import {lodash} from "../../../external-lib/Lodash";

export type CardListingResultComparison = {
  areEqual:boolean,
  numberInBoth:number,
  numberInResultOneOnly:number,
  numberInResultTwoOnly:number,
  notEqualPairs:Array<NotEqualPairing>,
}

export type NotEqualPairing = {
  ebayId:string,
  ebayUrl:string,
  notEqualFields:Array<NotEqualField>,
}

export type NotEqualField = {
  fieldName:string,
  resultOneValue:any,
  resultTwoValue:any,
}

const compareListing = (resultOneListing:EbayCardListing, resultTwoListing:EbayCardListing):Array<NotEqualField> => {
  const notEqualFields:Array<NotEqualField> = [];
  const fields = Object.keys(resultOneListing);
  fields.forEach(field => {
    // @ts-ignore
    const valueOne:any = resultOneListing[field];
    // @ts-ignore
    const valueTwo:any = resultTwoListing[field];
    if (lodash.isNotEqual(valueOne, valueTwo)) {
      notEqualFields.push({
        fieldName: field,
        resultOneValue: valueOne,
        resultTwoValue: valueTwo,
      })
    }
  })
  return notEqualFields;
}

const compare = (resultOne:EbayCardListingResult, resultTwo:EbayCardListingResult):CardListingResultComparison => {

  const resultOneListings = resultOne.cardListings;
  const resultOneIdMappings = new Map<string, EbayCardListing>();
  resultOneListings.forEach(listing => {
    resultOneIdMappings.set(listing.ebayId, listing);
  });

  const resultTwoListings = resultTwo.cardListings;
  const resultTwoIdMappings = new Map<string, EbayCardListing>();
  resultTwoListings.forEach(listing => {
    resultTwoIdMappings.set(listing.ebayId, listing);
  });

  const inBoth = [];
  const inResultOneOnly = [];
  const inResultTwoOnly = [];
  const notEqualPairs:Array<NotEqualPairing> = [];

  resultOneListings.forEach(listing => {
    const id = listing.ebayId;
    const resultTwoListing = resultTwoIdMappings.get(id);
    if (resultTwoListing) {
      inBoth.push(listing);
      const notEqualFields = compareListing(listing, resultTwoListing);
      if (notEqualFields.length > 0) {
        notEqualPairs.push({
          ebayId: listing.ebayId,
          ebayUrl: listing.ebayLink,
          notEqualFields: notEqualFields,
        });
      }
    } else {
      inResultOneOnly.push(listing);
    }
  });
  resultTwoListings.forEach(listing => {
    const id = listing.ebayId;
    if (!resultOneIdMappings.has(id)) {
      inResultTwoOnly.push(listing);
    }
  })

  const result = lodash.isEqual(resultOneIdMappings, resultTwoIdMappings);

  return {
    areEqual: result,
    numberInBoth: inBoth.length,
    numberInResultOneOnly: inResultOneOnly.length,
    numberInResultTwoOnly: inResultTwoOnly.length,
    notEqualPairs: notEqualPairs,
  }
}

export const ebayCardListingResultComparer = {
  compare,
}