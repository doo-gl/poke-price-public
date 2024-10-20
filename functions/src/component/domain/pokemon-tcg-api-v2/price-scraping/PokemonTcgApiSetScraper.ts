import {setRetriever} from "../../set/SetRetriever";
import {
  pokemonTcgApiSetScrapeCreator,
  PokemonTcgApiSetScrapeEntity,
  pokemonTcgApiSetScrapeUpdater,
} from "./PokemonTcgApiSetScrapeEntity";
import {pokemonTcgApiSetScrapeRetriever} from "./PokemonTcgApiSetScrapeRetriever";
import {Create} from "../../../database/Entity";
import {TimestampStatic} from "../../../external-lib/Firebase";
import {pokemonTcgApiClientV2} from "../../../client/PokemonTcgApiClientV2";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {pokemonTcgApiPriceRecorder} from "./PokemonTcgApiPriceRecorder";
import {EventContext, logger} from "firebase-functions";
import {timestampToMoment} from "../../../tools/TimeConverter";
import moment from "moment";
import {getOptionalPokemonTcgApiSetIdentifiers, SetEntity} from "../../set/SetEntity";
import {taskRunner} from "../../../infrastructure/TaskRunner";
import {uuid} from "../../../external-lib/Uuid";
import {JobCallback} from "../../../jobs/ScheduledJobCreator";
import {setRepository} from "../../set/SetRepository";

const TIME_TO_RUN_FOR_SECONDS = 300;
const HOURS_BETWEEN_SCRAPE_ATTEMPTS = 48

const getSertSetScrape = async (set:SetEntity):Promise<PokemonTcgApiSetScrapeEntity|null> => {
  const preExistingSetScrape = await pokemonTcgApiSetScrapeRetriever.retrieveOptionalBySetId(set.id)
  if (preExistingSetScrape) {
    return preExistingSetScrape
  }
  const setId = set.id
  const pokemonTcgApiSetIdentifiers = getOptionalPokemonTcgApiSetIdentifiers(set)
  if (!pokemonTcgApiSetIdentifiers) {
    return null
  }
  const pokemonTcgApiSetId = pokemonTcgApiSetIdentifiers.code
  const create:Create<PokemonTcgApiSetScrapeEntity> = {
    setId,
    pokemonTcgApiSetId,
    lastError: null,
    lastScrapeAttempt: TimestampStatic.fromMillis(0),
    lastSuccessfulScrapeAttempt: TimestampStatic.fromMillis(0),
  }
  const setScrape = await pokemonTcgApiSetScrapeCreator.create(create)
  return setScrape
}

const canScrapeForPrices = (setScrape:PokemonTcgApiSetScrapeEntity):boolean => {
  const lastScrape = timestampToMoment(setScrape.lastScrapeAttempt)
  const earliestNextScrape = lastScrape.add(HOURS_BETWEEN_SCRAPE_ATTEMPTS, 'hours')
  return moment().isAfter(earliestNextScrape)
}

const scrape = async (setId:string):Promise<PokemonTcgApiSetScrapeEntity|null> => {
  const set = await setRetriever.retrieve(setId)
  const setScrape = await getSertSetScrape(set)
  if (!setScrape) {
    return null
  }
  if (!canScrapeForPrices(setScrape)) {
    logger.info(`Too early to scrape set: ${setId}, last scrape was ${setScrape.lastScrapeAttempt.toDate().toISOString()}`)
    return setScrape
  }
  try {
    const tcgCards = await pokemonTcgApiClientV2.getCardsForSetId(setScrape.pokemonTcgApiSetId)
    const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 10})
    await Promise.all(
      tcgCards.map(tcgCard => queue.addPromise(() => pokemonTcgApiPriceRecorder.record(tcgCard)))
    )
    return await pokemonTcgApiSetScrapeUpdater.updateAndReturn(setScrape.id, {
      lastScrapeAttempt: TimestampStatic.now(),
      lastSuccessfulScrapeAttempt: TimestampStatic.now(),
      lastError: null,
    })
  } catch (err:any) {
    logger.error(`Failed to update cards with new TCG API prices, Set Scrape: ${setScrape.id}, ${err.message}`)
    return await pokemonTcgApiSetScrapeUpdater.updateAndReturn(setScrape.id, {
      lastScrapeAttempt: TimestampStatic.now(),
      lastError: err.message,
    })
  }
}

const getNextSetToScrape = async ():Promise<PokemonTcgApiSetScrapeEntity|null> => {

  const nextSetScrapes = await pokemonTcgApiSetScrapeRetriever.retrieveByLastAttemptAsc(1)
  if (nextSetScrapes.length === 0) {
    logger.info(`No set scrapes available`)
    return null
  }
  const nextSetScrape = nextSetScrapes[0]
  if (!canScrapeForPrices(nextSetScrape)) {
    logger.info(`Too early to scrape set: ${nextSetScrape.setId}, last scrape was ${nextSetScrape.lastScrapeAttempt.toDate().toISOString()}`)
    return null
  }
  logger.info(`Scraping set: ${nextSetScrape.setId}`)
  return nextSetScrape
}

const runSetScrapingJob = async () => {
  await taskRunner.runFor(
    TIME_TO_RUN_FOR_SECONDS,
    1,
    async () => {
      const nextSetScrape = await getNextSetToScrape()

      if (!nextSetScrape) {
        return null
      }

      return {
        id: uuid(),
        doTask: async () => {
          await scrape(nextSetScrape.setId)
        },
      }
    },
    (err) => {
      logger.error(`Error while processing task`, err);
    }
  )
}

const initialiseSetScrapes = async () => {
  const sets = await setRepository.getMany([])
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 10})
  await Promise.all(sets.map(set => queue.addPromise(() => getSertSetScrape(set))))
}

export const pokemonTcgApiSetScraper = {
  initialiseSetScrapes,
  runSetScrapingJob,
  scrape,
  getSertSetScrape,
}

export const PokemonTcgApiSetScrapingJob:JobCallback = async (context:EventContext|null) => {
  logger.info('Starting Set Scrape Job')
  await pokemonTcgApiSetScraper.runSetScrapingJob()
  logger.info('Finished Set Scrape Job')
  return Promise.resolve();
}