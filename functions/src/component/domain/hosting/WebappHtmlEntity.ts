import {Entity} from "../../database/Entity";

export enum Environment {
  DEV = 'DEV',
  PROD = 'PROD',
}

export interface WebappHtmlEntity extends Entity {
  environment:Environment,
  html:string,
}