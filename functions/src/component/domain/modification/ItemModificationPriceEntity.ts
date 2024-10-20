import {MongoEntity} from "../../database/mongo/MongoEntity";
import {ItemModification} from "./ItemModification";
import {Stats} from "../stats/card-v2/CardStatsEntityV2";


export interface ItemModificationPriceEntity extends MongoEntity {
  itemId:string,
  modificationKey:string,
  modification:ItemModification,
  stats:Stats,
  from:Date,
  to:Date,
  priceIds:Array<string>,
}