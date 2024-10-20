import {CardVariant} from "../card/CardEntity";
import {portfolioIterator} from "./PortfolioIterator";
import {fromCurrencyAmountLike, fromOptionalCurrencyAmountLike} from "../money/CurrencyAmount";
import {userContext} from "../../infrastructure/UserContext";
import {NotFoundError} from "../../error/NotFoundError";
import {jsonToCsv} from "../../external-lib/JsonToCsv";
import {toCard} from "../item/CardItem";
import {itemPriceQuerier} from "../item/ItemPriceQuerier";
import {legacyIdOrFallback} from "../item/ItemEntity";
import {userRetriever} from "../user/UserRetriever";
import {extractUserCurrencyCode} from "../user/UserEntity";


export interface PortfolioCsvRow {
  cardId:string,
  series:string,
  set:string,
  cardNumber:string,
  setNumber:string,
  variant:CardVariant,
  cardName:string,
  url:string,
  soldPokePrice:string|null,
  numberOfSales:number|null,
  lastSoldPokePriceCalculation:string|null,
  listingPokePrice:string|null
  cheapestListingPrice:string|null,
  numberOfListings:number|null,
  lastListingPokePriceCalculation:string|null,
}

const retrieveRows = async (userId:string):Promise<Array<PortfolioCsvRow>> => {
  const rows:Array<PortfolioCsvRow> = [];
  const user = await userRetriever.retrieve(userId)
  const currencyCode = extractUserCurrencyCode(user)
  await portfolioIterator.iterate(
    userId,
    detail => {
      const card = detail.card;
      const cardDetails = toCard(card)
      if (!cardDetails) {
        return
      }
      const soldDetails = itemPriceQuerier.soldDetails(card, currencyCode);
      const listingDetails = itemPriceQuerier.listingDetails(card, currencyCode);
      rows.push({
        cardId: legacyIdOrFallback(card),
        series: cardDetails.series,
        set: cardDetails.set,
        cardNumber: cardDetails.cardNumber,
        setNumber: cardDetails.setNumber,
        variant: cardDetails.variant,
        cardName: card.displayName,
        url: `https://pokeprice.io/card/${legacyIdOrFallback(card)}`,
        soldPokePrice: fromOptionalCurrencyAmountLike(soldDetails?.price ?? null)?.toString() ?? null,
        numberOfSales: soldDetails?.volume ?? null,
        lastSoldPokePriceCalculation: soldDetails?.lastUpdatedAt?.toISOString() ?? null,
        listingPokePrice: fromOptionalCurrencyAmountLike(listingDetails?.price ?? null)?.toString() ?? null,
        cheapestListingPrice: fromOptionalCurrencyAmountLike(listingDetails?.minPrice ?? null)?.toString() ?? null,
        numberOfListings: listingDetails?.volume ?? null,
        lastListingPokePriceCalculation: listingDetails?.lastUpdatedAt?.toISOString() ?? null,
      })
    }
  )
  return rows;
}

const retrieveForCallingUser = async ():Promise<string> => {
  const user = userContext.getUser();
  if (!user) {
    throw new NotFoundError(`No Calling User`)
  }
  const rows = await retrieveRows(user.id);
  return jsonToCsv.parse(rows)
}

export const portfolioCsvRetriever = {
  retrieveForCallingUser,
}
