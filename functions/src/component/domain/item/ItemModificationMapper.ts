export interface GradingModificationDetails {
  graderKey:string,
  graderName:string,
  grade:string,
}

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

const GRADER_KEY_TO_PRIORITY = new Map<string, number>()
const getGraderKeyPriority = (key:string) => {
  if (GRADER_KEY_TO_PRIORITY.size === 0) {
    GRADER_KEYS.forEach((value:string, index:number) => {
      GRADER_KEY_TO_PRIORITY.set(value, GRADER_KEYS.length - index)
    })
  }
  return GRADER_KEY_TO_PRIORITY.get(key) ?? 0
}

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

const mapKeyToGradingModification = (modificationKey:string):GradingModificationDetails|null => {
  if (!modificationKey.startsWith('single-pokemon-card|grading')) {
    return null
  }
  const split = modificationKey.split("|")
  if (split.length !== 4) {
    return null
  }
  const graderKey = split[2]
  const grade = split[3]
  const graderName = GRADER_KEY_TO_NAME.get(graderKey)
  if (!graderName) {
    return null
  }
  return {
    grade,
    graderKey,
    graderName,
  }
}

export const itemModificationMapper = {
  mapKeyToGradingModification,
  getGraderKeyPriority,
}