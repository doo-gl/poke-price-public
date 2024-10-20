import {UniqueSet} from "../set/UniqueSet";
import {CardVariant} from "./CardEntity";
import {CardLanguage} from "../item/ItemEntity";

export interface UniqueCard extends UniqueSet {
  numberInSet:string,
  variant:CardVariant,
  language:CardLanguage,
}

export interface CardId {
  cardId:string
}