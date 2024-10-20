import {Entity} from "../../../database/Entity";
import {Timestamp} from "../../../external-lib/Firebase";



interface CardQueryStatsEntity extends Entity {
  queryKey:string,
  queryDetails:{[name:string]:string},
  resultCount:number,
  cardIds:Array<string>,
  searchCount:number,
  searchTimestamps:Array<Timestamp>,
}