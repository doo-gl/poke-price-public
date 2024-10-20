import {TcgCollectorRegion, tcgCollectorWebScrapingClient} from "./TcgCollectorWebScrapingClient";
import {SetEntity, SetRegion, TcgCollectorSetExternalIdentifiers} from "../set/SetEntity";
import {ItemEntity} from "../item/ItemEntity";
import {ExpansionParseResult} from "./TcgCollectorExpansionsPageParserV2";
import {convertToKey} from "../../tools/KeyConverter";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {Create} from "../../database/Entity";
import {Timestamp} from "../../external-lib/Firebase";
import {momentToTimestamp} from "../../tools/TimeConverter";
import moment from "moment";
import {ExternalIdentifiers} from "../card/CardEntity";
import {CardDataSource} from "../card/CardDataSource";
import {setUpserter} from "../set/SetUpserter";
import {tcgCollectorItemSourcer} from "./TcgCollectorItemSourcer";
import {cardSlugGenerator} from "../card/seo/CardSlugGenerator";
import {relatedCardGenerator} from "../card/RelatedCardGenerator";
import {nextPreviousCardGenerator} from "../card/NextPreviousCardGenerator";
import {setToCardCollectionCreator} from "../card-collection/SetToCardCollectionCreator";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";

export interface SourcedSet {
  set:SetEntity,
  items:Array<ItemEntity>
}

const findExpansion = async (expansionName:string, region:TcgCollectorRegion):Promise<ExpansionParseResult> => {
  const expansions = region === "intl"
    ? await tcgCollectorWebScrapingClient.getInternationalExpansions()
    : await tcgCollectorWebScrapingClient.getJapaneseExpansions()
  const expansion = expansions.expansions.find(exp => convertToKey(exp.setName) === expansionName)
  if (!expansion) {
    throw new InvalidArgumentError(`Failed to find expansion for ${expansionName}, ${region}`)
  }
  return expansion
}

const RELEASE_DATE_FORMAT = 'MMM, DD YYYY';

const calculateCreate = (expansion:ExpansionParseResult):Create<SetEntity> => {
  const series = convertToKey(expansion.seriesName);
  const suffix = expansion.region !== "intl"
    ? `-${expansion.region}`
    : ''
  const name = convertToKey(expansion.setName) + suffix;
  const releaseDate:Timestamp = momentToTimestamp(moment(expansion.releaseDate, RELEASE_DATE_FORMAT));
  const totalCards = -1;
  const displaySetNumber = expansion.setCode ?? '';
  const imageUrl = expansion.setLogoUrl;
  const symbolUrl = expansion.setSymbolUrl;
  const externalIdentifier:TcgCollectorSetExternalIdentifiers = {
    name,
    region: expansion.region,
    url: expansion.tcgCollectorSetUrl,
  };
  const externalIdentifiers:ExternalIdentifiers = {
    [CardDataSource.TCG_COLLECTOR_WEBSITE]: externalIdentifier,
  };
  const newSetDetails:Create<SetEntity> = {
    series,
    name,
    releaseDate,
    totalCards,
    displaySetNumber,
    imageUrl,
    symbolUrl,
    externalIdentifiers,
    setCode: expansion.setCode,
    region: expansion.region === "jp" ? SetRegion.JAPANESE : SetRegion.INTERNATIONAL,
    pokePrice: null,
    searchKeywords: { includes: [], excludes: [], ignores: [] },
    backgroundImageUrl: null,
    visible: false,
  };
  return newSetDetails;
}

const source = async (expansionName:string, region:TcgCollectorRegion):Promise<SourcedSet> => {
  const expansion = await findExpansion(expansionName, region)
  const createSet = calculateCreate(expansion)
  const set = await setUpserter.upsert(createSet)
  const cardParseResults = await tcgCollectorWebScrapingClient.getCardsForExpansionUrl(expansion.tcgCollectorSetUrl)
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 5})
  const items = new Array<ItemEntity>()
  await Promise.all(
    cardParseResults.cards.map(cardParseResult => queue.addPromise(async () => {
      const upsertedItems = await tcgCollectorItemSourcer.upsertItem(set, cardParseResult)
      upsertedItems.forEach(itm => items.push(itm))
    }))
  )
  await cardSlugGenerator.generateForItems(items)
  await relatedCardGenerator.generateForSet(set)
  await nextPreviousCardGenerator.generateForSet(set)
  await setToCardCollectionCreator.create(set.id)
  return {
    set,
    items,
  }
}

export const tcgCollectorSetSourcer = {
  source,
}