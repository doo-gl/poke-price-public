import {Entity} from "../../../../database/Entity";


export interface GlobalExcludeKeywordEntity extends Entity {
  excludes:Array<string>,
}