import {Moment} from "moment";
import {LoadingState} from "../constants/LoadingState";


export interface EntityDto {
  id:string,
  dateCreated:Moment,
  dateLastModified:Moment,
}

export interface HistoricalStateDto {
  state:LoadingState,
  subState:string,
  detail:object,
  dateStateStarted:Moment,
}

export interface StatefulEntityDto extends EntityDto {
  dateStateStarted:Moment,
  state:LoadingState,
  subState:string,
  history:Array<HistoricalStateDto>,
}