import {CreateSetEntity, PokemonTcgApiSetExternalIdentifiers, SetEntity, SetRegion} from "../set/SetEntity";
import {ExternalIdentifiers} from "../card/CardEntity";
import {pokemonTcgApiClientV2, PokemonTcgSet} from "../../client/PokemonTcgApiClientV2";
import {Create} from "../../database/Entity";
import {NotFoundError} from "../../error/NotFoundError";
import {cardInfoSourcer} from "./CardInfoSourcer";
import {convertToKey} from "../../tools/KeyConverter";
import {momentToTimestamp} from "../../tools/TimeConverter";
import moment from "moment";
import {CardDataSource} from "../card/CardDataSource";
import {sourcedSetHacks} from "./SourcedSetHacks";
import {Timestamp, TimestampStatic} from "../../external-lib/Firebase";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {ItemEntity, legacyIdOrFallback} from "../item/ItemEntity";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {tcgPlayerMarketDataSourcer} from "../tcg-player/TcgPlayerMarketDataSourcer";
import {reverseHoloCardCloner} from "../card/ReverseHoloCardCloner";
import {cardSlugGenerator} from "../card/seo/CardSlugGenerator";
import {relatedCardGenerator} from "../card/RelatedCardGenerator";
import {nextPreviousCardGenerator} from "../card/NextPreviousCardGenerator";
import {setToCardCollectionCreator} from "../card-collection/SetToCardCollectionCreator";
import {ebayCardSearchParamCreator} from "../ebay/search-param/EbayCardSearchParamCreator";
import {ebaySearchParamUpdater} from "../ebay/search-param/EbayCardSearchParamUpdater";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {pokemonTcgApiSetScraper} from "./price-scraping/PokemonTcgApiSetScraper";
import {setUpserter} from "../set/SetUpserter";

export interface SetSourceResult {
  set:SetEntity|null,
  cards:Array<ItemEntity>,
}

const RELEASE_DATE_FORMAT = 'YYYY/MM/DD';

const calculateSetCreate = (tcgSet:PokemonTcgSet):Create<SetEntity> => {
  const series = convertToKey(tcgSet.series);
  const name = convertToKey(tcgSet.name);
  const releaseDate:Timestamp = momentToTimestamp(moment(tcgSet.releaseDate, RELEASE_DATE_FORMAT));
  const totalCards = Number(tcgSet.printedTotal);
  const displaySetNumber = `${tcgSet.printedTotal}`;
  const imageUrl = tcgSet.images.logo;
  const symbolUrl = tcgSet.images.symbol;
  const externalIdentifier:PokemonTcgApiSetExternalIdentifiers = {
    code: tcgSet.id,
    url: `https://api.pokemontcg.io/v2/sets/${tcgSet.id}`,
    setLastUpdated: tcgSet.updatedAt,
  };
  const externalIdentifiers:ExternalIdentifiers = {
    [CardDataSource.POKEMON_TCG_API]: externalIdentifier,
  };
  const newSetDetails:CreateSetEntity = {
    series,
    name,
    releaseDate,
    totalCards,
    displaySetNumber,
    imageUrl,
    symbolUrl,
    externalIdentifiers,
    pokePrice: null,
    region: SetRegion.INTERNATIONAL,
    searchKeywords: { includes: [], excludes: [], ignores: [] },
    backgroundImageUrl: null,
    visible: false,
  };
  return newSetDetails;
}

// const sourceV2 = async (pokemonTcgApiSetId:string):Promise<SetSourceResult> => {
//   // gather all the creates / updates for set / items
//   // if doing a dry run, log all the creates / updates
//   // else apply all the creates / updates - making sure to apply the set id after creation
// }

const source = async (pokemonTcgApiSetId:string):Promise<SetSourceResult> => {
  const tcgSet = await pokemonTcgApiClientV2.getSet(pokemonTcgApiSetId);
  if (!tcgSet) {
    throw new NotFoundError(`Could not find a set for id: ${pokemonTcgApiSetId}`);
  }
  const createSet = calculateSetCreate(tcgSet)
  const set = await setUpserter.upsert(createSet);
  const tcgCards = await pokemonTcgApiClientV2.getCardsInSet(tcgSet);
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 20})
  const cards = new Array<ItemEntity>();
  await Promise.all(
    tcgCards.map(tcgCard => queue.addPromise(async () => {
      const card = await cardInfoSourcer.upsertCard(set, tcgCard)
      cards.push(card)
    })),
  );
  await pokemonTcgApiSetScraper.getSertSetScrape(set)
  const result:SetSourceResult = {
    set,
    cards,
  };
  const resultAfterHacks = sourcedSetHacks.applyHacks(result);
  return resultAfterHacks;
}

const sourceCard = async (pokemonTcgApiSetId:string, cardNumber:string):Promise<SetSourceResult> => {
  const tcgSet = await pokemonTcgApiClientV2.getSet(pokemonTcgApiSetId);
  if (!tcgSet) {
    throw new NotFoundError(`Could not find a set for id: ${pokemonTcgApiSetId}`);
  }
  const createSet = calculateSetCreate(tcgSet)
  const set = await setUpserter.upsert(createSet);
  const tcgCards = await pokemonTcgApiClientV2.getCardsInSet(tcgSet);
  const tcgCard = tcgCards.find(crd => crd.number === cardNumber);
  if (!tcgCard) {
    throw new InvalidArgumentError(`No card numbered: ${cardNumber}`)
  }
  const card = await cardInfoSourcer.upsertCard(set, tcgCard)
  const result:SetSourceResult = {
    set,
    cards: [card],
  };
  return result
}

const doExtras = async (set:SetEntity) => {
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 5})
  const items = await cardItemRetriever.retrieveBySetId(set.id)
  await cardSlugGenerator.generateForItems(items)
  await relatedCardGenerator.generateForSet(set)
  await nextPreviousCardGenerator.generateForSet(set)
  await setToCardCollectionCreator.create(set.id)
  // await tcgPlayerMarketDataSourcer.source(set.series, set.name)
  await pokemonTcgApiSetScraper.scrape(set.id)

  await Promise.all(items.map(item => queue.addPromise(async () => {
    const searchParams = await ebayCardSearchParamCreator.getOrCreateSearchParams(legacyIdOrFallback(item))
    await ebaySearchParamUpdater.update(searchParams.id, {
      backfillTime: TimestampStatic.now(),
    })
  })))
}

const sourceSetWithExtras = async (pokemonTcgApiSetId:string, withReverseHolos:boolean):Promise<SetSourceResult> => {

  const sourceResult = await source(pokemonTcgApiSetId);
  const set = sourceResult.set
  if (!set) {
    throw new Error("No set")
  }

  if (withReverseHolos) {
    await reverseHoloCardCloner.cloneForSet(set.id)
  }

  await doExtras(set)
  return sourceResult
}

export const setInfoSourcer = {
  source,
  sourceCard,
  sourceSetWithExtras,
}