import {LoadingState} from "../constants/LoadingState";
import {Entity} from "./Entity";
import {Timestamp} from "../external-lib/Firebase";

export interface HistoricalState {
  state:LoadingState,
  subState:string,
  detail:object,
  dateStateStarted:Timestamp,
}

export interface StatefulEntity extends Entity {
  dateStateStarted:Timestamp,
  state:LoadingState,
  subState:string,
  history:Array<HistoricalState>,
}