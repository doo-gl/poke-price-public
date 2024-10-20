import {Entity} from "../../../database/Entity";

export enum Operation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum Result {
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
}

export interface AdminAuditLogEntity extends Entity {
  operation:Operation,
  entityId:string|null,
  entityType:string,
  previousValue:any,
  changeValue:any
  newValue:any,
  result:Result,
  detail:any,
  userId:string,
}