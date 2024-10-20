import {CardPageParseResult, tcgCollectorCardPageParser} from "./TcgCollectorCardPageParser";
import {ExpansionsPageParseResult, tcgCollectorExpansionPageParser} from "./TcgCollectorExpansionsPageParserV2";
import {baseExternalClient} from "../../client/BaseExternalClient";
import {tcgCollectorCardsPageParser} from "./TcgCollectorCardsPageParser";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";


export interface GetCardsForExpansionResponse {
  cards:Array<CardPageParseResult>
}

export type TcgCollectorRegion = 'jp'|'intl'

const getCardsForExpansionUrl = async (expansionCardListUrl:string):Promise<GetCardsForExpansionResponse> => {
  const cardListHtml = await baseExternalClient.get<string>(expansionCardListUrl, null, null)
  const cardListResponse = await tcgCollectorCardsPageParser.parse(expansionCardListUrl, cardListHtml)

  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 5})
  const cardResponses = new Array<CardPageParseResult>()

  await Promise.all(cardListResponse.cardUrls.map(cardUrl => queue.addPromise(async () => {
    const cardHtml = await baseExternalClient.get<string>(cardUrl, null, null)
    const cardResponse = await tcgCollectorCardPageParser.parse(cardUrl, cardHtml)
    cardResponses.push(cardResponse)
  })))

  return {cards: cardResponses}
}

const getCardsForExpansionName = (expansionName:string, region:TcgCollectorRegion):Promise<GetCardsForExpansionResponse> => {
  return getCardsForExpansionUrl(`https://www.tcgcollector.com/cards/${region}/${expansionName}`)
}

const getInternationalExpansions = async ():Promise<ExpansionsPageParseResult> => {
  const url = "https://www.tcgcollector.com/expansions/intl?displayAs=logos"
  const html = await baseExternalClient.get<string>(url, null, null)
  return tcgCollectorExpansionPageParser.parse(url, html)
}

const getJapaneseExpansions = async ():Promise<ExpansionsPageParseResult> => {
  const url = "https://www.tcgcollector.com/expansions/jp?displayAs=logos"
  const html = await baseExternalClient.get<string>(url, null, null)
  return tcgCollectorExpansionPageParser.parse(url, html)
}


export const tcgCollectorWebScrapingClient = {
  getCardsForExpansionName,
  getCardsForExpansionUrl,
  getInternationalExpansions,
  getJapaneseExpansions,
}