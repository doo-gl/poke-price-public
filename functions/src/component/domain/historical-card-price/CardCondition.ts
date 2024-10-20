import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";


export enum CardCondition {
  DAMAGED = 'DAMAGED',
  HEAVILY_PLAYED = 'HEAVILY_PLAYED',
  MODERATELY_PLAYED = 'MODERATELY_PLAYED',
  LIGHTLY_PLAYED = 'LIGHTLY_PLAYED',
  NEAR_MINT = 'NEAR_MINT',
}

const NOT_NEAR_MINT_CONDITIONS = new Set<string>(
  Object.values(CardCondition)
    .filter(condition => condition !== CardCondition.NEAR_MINT)
)
export const notNearMint = (condition:CardCondition):boolean => {
  return NOT_NEAR_MINT_CONDITIONS.has(condition)
}

export const cardConditionLabel = (condition:CardCondition):string => {
  switch (condition) {
    case CardCondition.NEAR_MINT:
      return 'Near Mint';
    case CardCondition.LIGHTLY_PLAYED:
      return 'Lightly Played';
    case CardCondition.MODERATELY_PLAYED:
      return 'Moderately Played';
    case CardCondition.HEAVILY_PLAYED:
      return 'Heavily Played';
    case CardCondition.DAMAGED:
      return 'Damaged';
  }
}

export const cardConditionShortLabel = (condition:CardCondition):string => {
  switch (condition) {
    case CardCondition.NEAR_MINT:
      return 'NM/M';
    case CardCondition.LIGHTLY_PLAYED:
      return 'LP';
    case CardCondition.MODERATELY_PLAYED:
      return 'MP';
    case CardCondition.HEAVILY_PLAYED:
      return 'HP';
    case CardCondition.DAMAGED:
      return 'DMG';
  }
}

export const mapConditionToPriority = (condition:CardCondition):number => {
  switch (condition) {
    case CardCondition.NEAR_MINT:
      return 1
    case CardCondition.LIGHTLY_PLAYED:
      return 2
    case CardCondition.MODERATELY_PLAYED:
      return 3
    case CardCondition.HEAVILY_PLAYED:
      return 4
    case CardCondition.DAMAGED:
      return 5
    default:
      return 6
  }
}

export const BY_CONDITION_DESC = comparatorBuilder.objectAttributeDESC<CardCondition, number>(
  value => mapConditionToPriority(value)
)
export const BY_CONDITION_ASC = comparatorBuilder.objectAttributeASC<CardCondition, number>(
  value => mapConditionToPriority(value)
)