import {ItemModificationIdentificationResult} from "./ItemModificationIdentificationResult";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {searchParamValidator} from "../ebay/search-param/SearchParamValidator";
import {GRADING_MODIFICATION_TYPE, GradingModificationDetails, ItemModification} from "./ItemModification";
import {logger} from "firebase-functions";
import {ItemModificationIdentificationRequest} from "./ItemModificationIdentificationRequest";

export const GRADING_FILTER_TERMS = [
  'graded',
  'grade',
  'psa',
  'gsg',
  'sgc',
  'dsg',
  'bsg', // bsg is the old name for dsg
  'egs',
  'bgs',
  'cgc',
  'gma',
  'pca',
  'pgc',
  'pcg',
  'mgc',
  'ags',
  'beckett', // beckett is also known as bgs
  'getgraded',
  'gg',
  'cga',
  'onlygraded',
  'only+graded',
  'ace',
  'ace+grading',
  'pokegrade',
  'pokégrade',
  'pg',
]

const PSA_GRADER_KEY = 'psa'
const GSG_GRADER_KEY = 'gsg'
const SGC_GRADER_KEY = 'sgc'
const DSG_GRADER_KEY = 'dsg'
const EGS_GRADER_KEY = 'egs'
const CGC_GRADER_KEY = 'cgc'
const GMA_GRADER_KEY = 'gma'
const PCA_GRADER_KEY = 'pca'
const PGC_GRADER_KEY = 'pgc'
const PCG_GRADER_KEY = 'pcg'
const MGC_GRADER_KEY = 'mgc'
const AGS_GRADER_KEY = 'ags'
const BECKETT_GRADER_KEY = 'beckett'
const GETGRADED_GRADER_KEY = 'getgraded'
const ONLYGRADED_GRADER_KEY = 'onlygraded'
const ACEGRADING_GRADER_KEY = 'acegrading'
const POKEGRADE_GRADER_KEY = 'pokegrade'

// work out priority order of grading companies
// on ebay type "charizard" + grading company name
// count results - be sure to check US
const GRADER_KEYS = [
  PSA_GRADER_KEY, // 12k
  CGC_GRADER_KEY, // 4k
  BECKETT_GRADER_KEY, // 800
  GMA_GRADER_KEY, // 360
  ACEGRADING_GRADER_KEY, // 353
  PCG_GRADER_KEY, // 320
  GETGRADED_GRADER_KEY, // 212
  SGC_GRADER_KEY, // 211
  PCA_GRADER_KEY, // 75
  POKEGRADE_GRADER_KEY, // 70
  MGC_GRADER_KEY, // 53
  DSG_GRADER_KEY, // 37
  AGS_GRADER_KEY, // 30
  ONLYGRADED_GRADER_KEY, // 18
  PGC_GRADER_KEY, // 15
  EGS_GRADER_KEY, // 11
]

const GRADER_KEY_TO_NAME = new Map<string, string>([
  [PSA_GRADER_KEY, 'PSA'],
  [GSG_GRADER_KEY, 'GSG'],
  [SGC_GRADER_KEY, 'SGC'],
  [DSG_GRADER_KEY, 'DSG'],
  [EGS_GRADER_KEY, 'EGS'],
  [CGC_GRADER_KEY, 'CGC'],
  [GMA_GRADER_KEY, 'GMA'],
  [PCA_GRADER_KEY, 'PCA'],
  [PGC_GRADER_KEY, 'PGC'],
  [PCG_GRADER_KEY, 'PCG'],
  [AGS_GRADER_KEY, 'AGS'],
  [MGC_GRADER_KEY, 'MGC'],
  [BECKETT_GRADER_KEY, 'Beckett'],
  [GETGRADED_GRADER_KEY, 'Get Graded'],
  [ONLYGRADED_GRADER_KEY, 'Only Graded'],
  [ACEGRADING_GRADER_KEY, 'Ace Grading'],
  [POKEGRADE_GRADER_KEY, 'Pokégrade'],
])

const GRADER_KEY_TO_NAME_INCLUDE_REGEXES = new Map<string, Array<string>>([
  [PSA_GRADER_KEY, ['\\bpsa[\\s]*([\\d\\.]+)\\b', '\\bpsa[\\s]+grade[\\s]+([\\d\\.]+)\\b']],
  [GSG_GRADER_KEY, ['\\bgsg[\\s]*([\\d\\.]+)\\b', '\\bgsg[\\s]+grade[\\s]+([\\d\\.]+)\\b']],
  [SGC_GRADER_KEY, ['\\bsgc[\\s]*([\\d\\.]+)\\b', '\\bsgc[\\s]+grade[\\s]+([\\d\\.]+)\\b']],
  [DSG_GRADER_KEY, ['\\bdsg[\\s]*([\\d\\.]+)\\b', '\\bdsg[\\s]+grade[\\s]+([\\d\\.]+)\\b']],
  [EGS_GRADER_KEY, ['\\begs[\\s]*([\\d\\.]+)\\b', '\\begs[\\s]+grade[\\s]+([\\d\\.]+)\\b']],
  [CGC_GRADER_KEY, ['\\bcgc[\\s]*([\\d\\.]+)\\b', '\\bcgc[\\s]+grade[\\s]+([\\d\\.]+)\\b']],
  [GMA_GRADER_KEY, ['\\bgma[\\s]*([\\d\\.]+)\\b', '\\bgma[\\s]+grade[\\s]+([\\d\\.]+)\\b']],
  [PCA_GRADER_KEY, ['\\bpca[\\s]*([\\d\\.]+)\\b', '\\bpca[\\s]+grade[\\s]+([\\d\\.]+)\\b']],
  [PGC_GRADER_KEY, ['\\bpgc[\\s]*([\\d\\.]+)\\b', '\\bpgc[\\s]+grade[\\s]+([\\d\\.]+)\\b']],
  [PCG_GRADER_KEY, ['\\bpcg[\\s]*([\\d\\.]+)\\b', '\\bpsa[\\s]+grade[\\s]+([\\d\\.]+)\\b']],
  [AGS_GRADER_KEY, ['\\bags[\\s]*([\\d\\.]+)\\b', '\\bags[\\s]+grade[\\s]+([\\d\\.]+)\\b']],
  [MGC_GRADER_KEY, ['\\bmgc[\\s]*([\\d\\.]+)\\b', '\\bmgc[\\s]+grade[\\s]+([\\d\\.]+)\\b']],
  [BECKETT_GRADER_KEY, ['\\bbeckett[\\s]*([\\d\\.]+)\\b', '\\bbeckett[\\s]+grade[\\s]+([\\d\\.]+)\\b', '\\bbgs[\\s]*([\\d\\.]+)\\b', '\\bbgs[\\s]+grade[\\s]+([\\d\\.]+)\\b']],
  [GETGRADED_GRADER_KEY, [
    '\\bgetgraded[\\s]*([\\d\\.]+)\\b', '\\bgetgraded[\\s]+grade[\\s]+([\\d\\.]+)\\b',
    '\\bget[\\s]+graded[\\s]*([\\d\\.]+)\\b', '\\bget[\\s]+graded[\\s]+grade[\\s]+([\\d\\.]+)\\b',
    '\\bgg[\\s]*([\\d\\.]+)\\b', '\\bgg[\\s]+grade[\\s]+([\\d\\.]+)\\b',
  ]],
  [ONLYGRADED_GRADER_KEY, [
    '\\bonlygraded[\\s]*([\\d\\.]+)\\b', '\\bonlygraded[\\s]+grade[\\s]+([\\d\\.]+)\\b',
    '\\bonly[\\s]+graded[\\s]*([\\d\\.]+)\\b', '\\bonly[\\s]+graded[\\s]+grade[\\s]+([\\d\\.]+)\\b',
    '\\bog[\\s]*([\\d\\.]+)\\b', '\\bog[\\s]+grade[\\s]+([\\d\\.]+)\\b',
  ]],
  [ACEGRADING_GRADER_KEY, [
    '\\bace[\\s]*([\\d\\.]+)\\b',
    '\\bace[\\s]+graded[\\s]*([\\d\\.]+)\\b',
    '\\bace[\\s]+grading[\\s]*([\\d\\.]+)\\b',
  ]],
  [POKEGRADE_GRADER_KEY, [
    '\\bpokegrade[\\s]*([\\d\\.]+)\\b', '\\bpokegrade[\\s]+grade[\\s]+([\\d\\.]+)\\b',
    '\\bpg[\\s]*([\\d\\.]+)\\b', '\\bpg[\\s]+grade[\\s]+([\\d\\.]+)\\b',
  ]],
])


const GRADER_KEY_TO_SPECIFIC_REGEXES = new Map<string, Array<string>>([
  [PSA_GRADER_KEY, ['Professional Sports Authenticator', 'PSA']],
  [GSG_GRADER_KEY, ['GSG', 'Gold Standard Grading']],
  [SGC_GRADER_KEY, ['SGC', 'Sportscard Guaranty Corporation']],
  [DSG_GRADER_KEY, ['DSG', 'Diamond Service Grading']],
  [EGS_GRADER_KEY, ['EGS', 'European Grading Service', 'EGS Global Grade']],
  [CGC_GRADER_KEY, ['CGC', 'Certified Guaranty Company']],
  [GMA_GRADER_KEY, ['GMA', 'GMA Grading']],
  [PCA_GRADER_KEY, ['PCA']],
  [PGC_GRADER_KEY, ['PGC']],
  [PCG_GRADER_KEY, ['PCG', 'Platinum Card Grading']],
  [AGS_GRADER_KEY, ['AGS', 'Automated Grading Systems']],
  [MGC_GRADER_KEY, ['MGC', 'Majesty Grading Company']],
  [BECKETT_GRADER_KEY, ['Beckett', 'bgs', 'Beckett Grading Services']],
  [GETGRADED_GRADER_KEY, ['Get Graded', 'GetGraded']],
  [ONLYGRADED_GRADER_KEY, ['Only Graded', 'OnlyGraded']],
  [ACEGRADING_GRADER_KEY, ['Ace Grading', 'AceGrading', 'Ace', 'Ace Graded']],
  [POKEGRADE_GRADER_KEY, ['Pokégrade', 'pokegrade']],
])

export const buildModificationKey = (graderKey:string, grade:string):string => {
  return `${SINGLE_POKEMON_CARD_ITEM_TYPE}|${GRADING_MODIFICATION_TYPE}|${graderKey}|${grade}`
}

const isInvalidGrade = (grade:string):boolean => {
  if (!grade) {
    return true
  }
  const gradeAsNumber = Number.parseFloat(grade)
  if (!gradeAsNumber || Number.isNaN(gradeAsNumber)) {
    return true
  }
  return gradeAsNumber < 0 || gradeAsNumber > 10
}

const readFromName = (listingName:string):ItemModification|null => {
  // go in reverse popularity order
  // many listings for less popular grading companies include more popular grading companies in the name
  // like "getgraded 10 NOT PSA"
  // so by going in reverse order if we make it through all the less popular ones we are pretty sure it is a popular one
  const reverseGraders = GRADER_KEYS.slice().reverse()

  // run through each grading company
  for (let gradingKeyIndex = 0; gradingKeyIndex < reverseGraders.length; gradingKeyIndex++) {
    const graderKey = reverseGraders[gradingKeyIndex]
    const graderName = GRADER_KEY_TO_NAME.get(graderKey)
    const regexes = GRADER_KEY_TO_NAME_INCLUDE_REGEXES.get(graderKey)
    if (!regexes || !graderName) {
      continue;
    }

    // for each grading company, try all the regexes for that company
    // if any match, return that grader + grade
    for (let regexIndex = 0; regexIndex < regexes.length; regexIndex++) {
      const regex = new RegExp(regexes[regexIndex], 'gim')
      const match = regex.exec(listingName)
      if (!match) {
        continue;
      }
      const grade = match[1]
      if (isInvalidGrade(grade)) {
        continue;
      }
      if (grade) {
        const details:GradingModificationDetails = {
          graderName,
          graderKey,
          grade,
        }
        return {
          name: graderName,
          key: buildModificationKey(graderKey, grade),
          type: GRADING_MODIFICATION_TYPE,
          details,
        }
      }
    }
  }

  // tried all graders and didn't match anything
  return null
}

const readFromSpecifics = (specifics:{[key:string]:string}):ItemModification|null => {
  const graderField = specifics['Professional Grader'] ?? specifics['Bewertungsexperte'] ?? null
  const gradeField = specifics['Grade'] ?? specifics['Bewertung'] ?? null

  const grader = graderField?.toLowerCase()?.trim()
  const grade = gradeField?.toLowerCase()?.trim()

  if (!grader || !grade) {
    return null
  }

  for (let graderIndex = 0; graderIndex < GRADER_KEYS.length; graderIndex++) {

    const graderKey = GRADER_KEYS[graderIndex]
    const graderName = GRADER_KEY_TO_NAME.get(graderKey)
    const regexes = GRADER_KEY_TO_SPECIFIC_REGEXES.get(graderKey)
    if (!regexes || !graderName) {
      continue
    }

    for (let regexIndex = 0; regexIndex < regexes.length; regexIndex++) {
      const regex = new RegExp(regexes[regexIndex])
      const match = regex.exec(grader)
      if (!match) {
        continue;
      }
      const details:GradingModificationDetails = {
        graderName,
        graderKey,
        grade,
      }
      return {
        name: graderName,
        key: buildModificationKey(graderKey, grade),
        type: GRADING_MODIFICATION_TYPE,
        details,
      }
    }
  }

  // tried all graders and didn't match anything
  return null
}

const identify = (request:ItemModificationIdentificationRequest):ItemModificationIdentificationResult => {
  const {
    item,
    listing,
  } = request
  if (item.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return {itemModification: null, shouldFilter: false}
  }

  const listingName = listing.listingName
  const listingSpecifics = listing.listingSpecifics

  const matchedGradingTerms = GRADING_FILTER_TERMS.filter(term => searchParamValidator.match(term, listingName.toLowerCase()))

  if (matchedGradingTerms.length === 0) {
    return {itemModification: null, shouldFilter: false}
  }

  const modFromName = readFromName(listingName)
  if (modFromName) {
    return {itemModification: modFromName, shouldFilter: false}
  }

  const modFromSpecifics = readFromSpecifics(listingSpecifics)
  if (modFromSpecifics) {
    return {itemModification: modFromSpecifics, shouldFilter: false}
  }

  logger.info(`Filtering listing: ${listing.listingUrl}, name: ${listingName} matched grading terms: ${matchedGradingTerms.join(',')} but could not determine grading details`)
  return {itemModification: null, shouldFilter: true}
}

export const gradingIdentifier = {
  identify,
}