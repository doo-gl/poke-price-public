import {Entity} from "../Entity";
import {LoadingState} from "../../constants/LoadingState";



export interface DuplicateResultEntity extends Entity {
  state:LoadingState,
  error:any,
  idempotencyKey:string,
  duplicateEntityIds:Array<string>,
  entityName:string,
  deletedEntities:Array<Entity>|null,
  keptEntityId:string|null,
}