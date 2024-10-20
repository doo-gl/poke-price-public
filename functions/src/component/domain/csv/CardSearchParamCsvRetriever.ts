import {CardVariant} from "../card/CardEntity";
import {cardRepository} from "../card/CardRepository";
import {setRetriever} from "../set/SetRetriever";
import {toInputValueMap} from "../../tools/MapBuilder";
import {logger} from "firebase-functions";
import {globalExcludeKeywordRetriever} from "../ebay/search-param/global-exclude/GlobalExcludeKeywordRetriever";
import {fromCurrencyAmountLike} from "../money/CurrencyAmount";
import {valueTagExtractor} from "../card/query/ValueTagExtractor";
import {jsonToCsv} from "../../external-lib/JsonToCsv";

interface CardSearchParamCsvRow {
  cardId:string,
  cardName:string,
  cardNumber:string,
  setNumber:string,
  set:string,
  series:string,
  variant:CardVariant,
  listingUrl:string|null,
  soldUrl:string|null,
  cardIncludes:string,
  cardExcludes:string,
  cardIgnores:string,
  setIncludes:string,
  setExcludes:string,
  setIgnores:string,
  globalExcludes:string,
  soldPrice:string|null,
  listingPrice:string|null,
  soldVolume:number|null,
  listingVolume:number|null,
  totalCirculation:number|null,
  supplyVsDemandRatio:number|null,
  volatility:number|null
}

const retrieveRows = async ():Promise<Array<CardSearchParamCsvRow>> => {
  const globalKeywords = await globalExcludeKeywordRetriever.retrieve()
  const sets = await setRetriever.retrieveAll()
  const setIdToSet = toInputValueMap(sets, set => set.id)

  const rows:Array<CardSearchParamCsvRow> = [];
  await cardRepository.iterator()
    .iterate(async card => {
      const set = setIdToSet.get(card.setId)
      if (!set) {
        logger.error(`Card: ${card.id}, has set: ${card.setId} that doesn't match a set`)
        return;
      }

      const pokePrice = card.pokePriceV2;
      const soldPrice = pokePrice?.soldPrice ? fromCurrencyAmountLike(pokePrice.soldPrice).toString() : null
      const listingPrice = pokePrice?.listingPrice ? fromCurrencyAmountLike(pokePrice.listingPrice).toString() : null
      const soldVolume = pokePrice && valueTagExtractor.calculateSoldVolume(pokePrice)
      const listingVolume = pokePrice && valueTagExtractor.calculateListingVolume(pokePrice)
      const totalCirculation = pokePrice && valueTagExtractor.calculateTotalCirculation(pokePrice)
      const supplyVsDemandRatio = pokePrice && valueTagExtractor.calculateSupplyVsDemand(pokePrice)
      const volatility = pokePrice && valueTagExtractor.calculateVolatility(pokePrice)

      const row:CardSearchParamCsvRow = {
        cardId: card.id,
        cardName: card.displayName,
        cardNumber: card.numberInSet,
        setNumber: card.displaySetNumber,
        variant: card.variant,
        set: card.set,
        series: card.series,
        listingUrl: card.listingUrl,
        soldUrl: card.soldUrl,
        cardIncludes: card.searchKeywords.includes.join('|'),
        cardExcludes: card.searchKeywords.excludes.join('|'),
        cardIgnores: card.searchKeywords.ignores.join('|'),
        setIncludes: set.searchKeywords.includes.join('|'),
        setExcludes: set.searchKeywords.excludes.join('|'),
        setIgnores: set.searchKeywords.ignores.join('|'),
        globalExcludes: globalKeywords.excludes.join('|'),
        soldPrice,
        listingPrice,
        soldVolume,
        listingVolume,
        totalCirculation,
        supplyVsDemandRatio,
        volatility,
      }
      rows.push(row)
    })
  return rows
}

const retrieve = async ():Promise<string> => {
  const rows = await retrieveRows()
  return jsonToCsv.parse(rows);
}

export const cardSearchParamCsvRetriever = {
  retrieve,
}