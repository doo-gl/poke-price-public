import {
  Card,
  CardPricePoint,
  CardPrices,
  CardSet,
  CardV2,
  GradedPricePoint,
  PricePoint,
} from "./TcgApiIntegrationModel";
import {setRetriever} from "../set/SetRetriever";
import {NotFoundError} from "../../error/NotFoundError";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {removeNulls} from "../../tools/ArrayNullRemover";
import {ItemEntity, ItemPriceDetails, PriceType} from "../item/ItemEntity";
import {CurrencyCode} from "../money/CurrencyCodes";
import {CardDataSource} from "../card/CardDataSource";
import {itemPriceQuerier} from "../item/ItemPriceQuerier";
import {toInputValueMultiMap} from "../../tools/MapBuilder";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {itemModificationMapper} from "../item/ItemModificationMapper";

const itemPriceDetailsToPricePoint = (details:ItemPriceDetails|null):PricePoint|null => {
  if (!details) {
    return null;
  }
  return {
    currencyCode: details.currencyCode,
    priceType: details.priceType,
    currenciesUsed: details.currenciesUsed,
    periodSizeDays: details.periodSizeDays,
    volume: details.volume,
    minPrice: details.minPrice,
    firstQuartile: details.firstQuartile ?? null,
    median: details.median ?? null,
    thirdQuartile: details.thirdQuartile ?? null,
    maxPrice: details.maxPrice,
    mean: details.mean ?? null,
    stdDev: details.stdDev ?? null,
  }
}

const priceDetailsToPricePoint = (priceDetails:ItemPriceDetails):CardPricePoint => {
  return {
    average: priceDetails.median?.amountInMinorUnits ?? null,
    low: priceDetails.firstQuartile?.amountInMinorUnits ?? null,
    high: priceDetails.thirdQuartile?.amountInMinorUnits ?? null,
    volume: priceDetails.volume ?? null,
  }
}

const itemToCardPrices = (item:ItemEntity, currencyCode:CurrencyCode):CardPrices => {

  const pokePriceId = item._id.toString()
  const sales = itemPriceQuerier.query(currencyCode, PriceType.SALE, item.itemPrices)
  const listings = itemPriceQuerier.query(currencyCode, PriceType.LISTING, item.itemPrices)
  const gradedPriceSales = item.itemPrices.modificationPrices?.filter(
    price => price.currencyCode === currencyCode
      && price.priceType === PriceType.SALE
  ) ?? []
  const gradeKeyToPrices = toInputValueMultiMap(gradedPriceSales, price => price.modificationKey)
  const gradedPrices = [...gradeKeyToPrices.entries()].map(entry => {
    const key = entry[0]
    const group = entry[1]
    const gradedPrice = group.sort(
      comparatorBuilder.combineAll(
        comparatorBuilder.objectAttributeDESC(val => val.volume),
        comparatorBuilder.objectAttributeASC(val => val.currenciesUsed?.length ?? 0),
        comparatorBuilder.objectAttributeDESC(val => val.periodSizeDays ?? 0),
      )
    ).find(() => true)
    return gradedPrice ?? null
  })

  const sortedGradedPrices:Array<GradedPricePoint|null> = removeNulls(gradedPrices).sort(comparatorBuilder.combineAll(
    comparatorBuilder.objectAttributeDESC(val => {
      const modificationKey = val.modificationKey
      if (!modificationKey) {
        return Number.MIN_VALUE
      }
      const graderDetails = itemModificationMapper.mapKeyToGradingModification(modificationKey)
      if (!graderDetails) {
        return Number.MIN_VALUE
      }
      const priority = itemModificationMapper.getGraderKeyPriority(graderDetails?.graderKey)
      return priority
    }),
    comparatorBuilder.objectAttributeDESC(val => {
      const modificationKey = val.modificationKey
      if (!modificationKey) {
        return Number.MIN_VALUE
      }
      const graderDetails = itemModificationMapper.mapKeyToGradingModification(modificationKey)
      if (!graderDetails) {
        return Number.MIN_VALUE
      }
      const grade = Number.parseFloat(graderDetails.grade)
      return Number.isNaN(grade)
        ? graderDetails.grade
        : grade
    })
  ))
    .map(details => {

      const modificationKey = details.modificationKey
      if (!modificationKey) {
        return null
      }
      const graderDetails = itemModificationMapper.mapKeyToGradingModification(modificationKey)
      if (!graderDetails) {
        return null
      }

      return {
        gradingCompany: graderDetails.graderName,
        grade: graderDetails.grade,
        average: details.median?.amountInMinorUnits ?? null,
        low: details.median?.amountInMinorUnits ?? null,
        high: details.median?.amountInMinorUnits ?? null,
        volume: details.volume ?? null,
      }
    })

  return {
    currencyCode,
    url: `https://pokeprice.io/item/${pokePriceId}`,
    rawEbayListings: listings ? priceDetailsToPricePoint(listings) : null,
    rawEbaySales: sales ? priceDetailsToPricePoint(sales) : null,
    gradedPrices: removeNulls(sortedGradedPrices),
  }
}

const itemToCard = (item:ItemEntity):CardV2|null => {
  const tcgApiId = item.metadata?.externalIdentifiers?.POKEMON_TCG_API?.id ?? null
  if (!tcgApiId) {
    return null
  }

  const pokePriceId = item._id.toString()
  return {
    pokePriceId,
    tcgApiId,
    pokePriceLink: `https://pokeprice.io/item/${pokePriceId}`,
    gbpPrices: itemToCardPrices(item, CurrencyCode.GBP),
    usdPrices: itemToCardPrices(item, CurrencyCode.USD),
  }

}

const retrieveForTcgApiCardId = async (tcgApiCardId:string):Promise<CardV2> => {
  const items = await cardItemRetriever.retrieveByPokemonTcgId(tcgApiCardId)
  if (items.length === 0) {
    throw new NotFoundError(`Failed to find card for id: ${tcgApiCardId}`)
  }
  const card = itemToCard(items[0])
  if (!card) {
    throw new NotFoundError(`Failed to find card for id: ${tcgApiCardId}`)
  }
  return card
}

const retrieveForTcgApiSetId = async (tcgApiSetId:string):Promise<CardSet> => {
  const set = await setRetriever.retrieveSetByPokemonTcgApiId(tcgApiSetId)
  if (!set) {
    throw new NotFoundError(`Failed to find set for id: ${tcgApiSetId}`)
  }
  // @ts-ignore
  const tcgApiId = set.externalIdentifiers[CardDataSource.POKEMON_TCG_API]?.code ?? null
  if (!tcgApiId) {
    throw new NotFoundError(`Failed to find set for id: ${tcgApiSetId}`)
  }
  const items = await cardItemRetriever.retrieveBySetId(set.id)
  const cards = removeNulls(items.map(item => itemToCard(item)))
  return {
    tcgApiId,
    pokePriceId: set.id,
    cards,
  }
}

export const tcgApiIntegrationCardRetriever = {
  retrieveForTcgApiSetId,
  retrieveForTcgApiCardId,
}