import {EbayOpenListingEntity} from "./EbayOpenListingEntity";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {logger} from "firebase-functions";

export interface WeightedCondition {
  condition:CardCondition
  weight:number,
}

export interface WeightedConditions {
  conditions:Array<WeightedCondition>,
}

export interface ConditionSourceDetails {
  id:string,
  listingName:string,
  sellersNotes:string|null,
  listingSpecifics:{[key:string]:string},
  listingDescription:string|null,
}

export interface ConditionMapping {
  condition:CardCondition,
  regex:RegExp,
}

// used to resolve situations where multiple conditions are weighted equally
const CONDITION_ORDERING:Map<CardCondition, number> = new Map<CardCondition, number>();
CONDITION_ORDERING.set(CardCondition.NEAR_MINT, 5);
CONDITION_ORDERING.set(CardCondition.LIGHTLY_PLAYED, 4);
CONDITION_ORDERING.set(CardCondition.MODERATELY_PLAYED, 3);
CONDITION_ORDERING.set(CardCondition.HEAVILY_PLAYED, 2);
CONDITION_ORDERING.set(CardCondition.DAMAGED, 1);

const SPECIFIC_WEIGHT = 70;
const LISTING_NAME_WEIGHT = 20;
const SELLER_NOTE_WEIGHT = 20;
const DESCRIPTION_WEIGHT = 2;

const calculate = (listing:ConditionSourceDetails):CardCondition => {

  const listingNameWeights = calculateFromListingName(listing);
  const specificWeights = calculateFromItemSpecifics(listing);
  const sellerNotesWeights = calculateFromSellersNotes(listing);
  const descriptionWeights = calculateFromDescription(listing);

  const mergedWeights = merge(
    listingNameWeights,
    merge(
      specificWeights,
      merge(
        sellerNotesWeights,
        descriptionWeights
      )
    )
  );

  if (mergedWeights.conditions.length === 0) {
    return CardCondition.NEAR_MINT;
  }
  // order by weight DESC, condition DESC, if 2 conditions are weighted equally, we assume it is the better of the 2
  const sortedConditions = mergedWeights.conditions.sort(
    comparatorBuilder.combine(
      comparatorBuilder.objectAttributeDESC(condition => condition.weight),
      comparatorBuilder.objectAttributeDESC(condition => CONDITION_ORDERING.get(condition.condition) || 0),
    )
  );
  return sortedConditions[0].condition;
}

const merge = (conditions1:WeightedConditions, conditions2:WeightedConditions):WeightedConditions => {

  const conditions:Map<CardCondition, number> = new Map<CardCondition, number>();

  conditions1.conditions.forEach(condition => {
    let weight = conditions.get(condition.condition);
    if (weight === undefined) {
      weight = 0;
    }
    weight += condition.weight;
    conditions.set(condition.condition, weight);
  })

  conditions2.conditions.forEach(condition => {
    let weight = conditions.get(condition.condition);
    if (weight === undefined) {
      weight = 0;
    }
    weight += condition.weight;
    conditions.set(condition.condition, weight);
  })

  return mapToWeightedConditions(conditions);
}

const mapToWeightedConditions = (map:Map<CardCondition, number>):WeightedConditions => {
  const result:WeightedConditions = {
    conditions: [],
  }
  map.forEach((value, key) => {
    result.conditions.push({ condition:key, weight: value })
  })
  return result;
}

const EBAY_CONDITION_MAPPINGS:Array<ConditionMapping> = [
  { condition: CardCondition.NEAR_MINT, regex: /(excellent|mint|brand\s+new)/gim },
  { condition: CardCondition.LIGHTLY_PLAYED, regex: /(good|light|played)/gim },
  { condition: CardCondition.MODERATELY_PLAYED, regex: /(moderate)/gim },
  { condition: CardCondition.HEAVILY_PLAYED, regex: /(heavy|heavily)/gim },
  { condition: CardCondition.DAMAGED, regex: /(damage)/gim },
]
const calculateFromItemSpecifics = (listing:ConditionSourceDetails):WeightedConditions => {

  if (
    !listing.listingSpecifics
    || Object.keys(listing.listingSpecifics).length === 0
    || !listing.listingSpecifics['Card Condition']
  ) {
    return { conditions: [] }
  }

  const ebayCondition = listing.listingSpecifics['Card Condition'];

  if (ebayCondition.toLowerCase() === 'see title') {
    return { conditions: [] }
  }

  for (const mapping of EBAY_CONDITION_MAPPINGS) {
    const regex = mapping.regex;
    const condition = mapping.condition;
    const isMatch = new RegExp(regex).test(ebayCondition)
    if (isMatch) {
      return { conditions: [ { condition: condition, weight: SPECIFIC_WEIGHT } ] }
    }
  }

  logger.warn(`Unmapped card condition ${ebayCondition}, on listing ${listing.id}`);
  return { conditions: [] }
}


const TEXT_CONDITION_MAPPINGS:Array<ConditionMapping> = [
  { condition: CardCondition.NEAR_MINT, regex: /(perfect|mint|excellent|pack|great\s+fresh|card\s+sleeved\s+straight\s+from\s+pack|condition\s+is\s+"new"|well\s+looked\s+after)/gim },
  { condition: CardCondition.NEAR_MINT, regex: /(never|not)\s+played\s+with/gim },
  { condition: CardCondition.NEAR_MINT, regex: /\b(NM|NM\/M|EXC|unplayed)\b/gim },
  { condition: CardCondition.LIGHTLY_PLAYED, regex: /s?light(ly)?\s+(play(ed)?|signs\s+of\s+wear|wear(ing)?|edge\s+wear(ing)?|marks?|scratch(es)?|scr?uffs?|damage)/gim },
  { condition: CardCondition.LIGHTLY_PLAYED, regex: /(\bLP\b|good\s+condition|condition\s+good|condition\s+is\s+good|whitening|silvering|small\s+marks|edge\s+wear|hairline|rough\s+edges?)/gim },
  { condition: CardCondition.MODERATELY_PLAYED, regex: /(moderate(ly)?|some)\s+(play(ed)?|signs\s+of\s+wear|wear(ing)?|edge\s+wear(ing)?|marks?|scratch(es)?|scr?uffs?|damage)/gim },
  { condition: CardCondition.MODERATELY_PLAYED, regex: /(\bMP\b|off\s+centre|crease)/gim },
  { condition: CardCondition.HEAVILY_PLAYED, regex: /(heavy|heavily|severe)\s+(play(ed)?|signs\s+of\s+wear|wear(ing)?|edge\s+wear(ing)?|marks?|scratch(es)?|scr?uffs?|damage)/gim },
  { condition: CardCondition.HEAVILY_PLAYED, regex: /(\bHP\b|discoloration|stain|bend|well\s+loved|(poor|terrible|awful|bad)\s+condition)/gim },
  { condition: CardCondition.DAMAGED, regex: /(\bdamaged\b)/gim },
  // need to see which terms indicate damaged vs. heavily played
]
const calculateFromListingName = (listing:ConditionSourceDetails):WeightedConditions => {
  const listingName = listing.listingName;
  return calculateFromText(listingName, LISTING_NAME_WEIGHT);
}

const calculateFromSellersNotes = (listing:ConditionSourceDetails):WeightedConditions => {
  const sellersNotes = listing.sellersNotes;
  if (!sellersNotes) {
    return { conditions: [] }
  }
  return calculateFromText(sellersNotes, SELLER_NOTE_WEIGHT);
}

const calculateFromDescription = (listing:ConditionSourceDetails):WeightedConditions => {
  const description = listing.listingDescription;
  if (!description) {
    return { conditions: [] }
  }
  return calculateFromText(description, DESCRIPTION_WEIGHT);
}

const calculateFromText = (text:string, weightingFactor:number):WeightedConditions => {
  const conditions:Map<CardCondition, number> = new Map<CardCondition, number>();
  for (const mapping of TEXT_CONDITION_MAPPINGS) {
    const regex = mapping.regex;
    const condition = mapping.condition;
    const isMatch = new RegExp(regex).test(text)
    if (isMatch) {
      let weight = conditions.get(condition);
      if (weight === undefined) {
        weight = 0;
      }
      weight += weightingFactor;
      conditions.set(condition, weight);
    }
  }
  return mapToWeightedConditions(conditions);
}

export const cardConditionCalculator = {
  calculate,
}