import {HistoricalState, StatefulEntity} from "../database/StatefulEntity";
import {EntityDto, HistoricalStateDto, StatefulEntityDto} from "./EntityDto";
import {entityDtoMapper} from "./EntityDtoMapper";
import {timestampToMoment} from "../tools/TimeConverter";

const mapHistoricalState = (historicalState:HistoricalState):HistoricalStateDto => {
  return {
    dateStateStarted: timestampToMoment(historicalState.dateStateStarted),
    detail: historicalState.detail,
    state: historicalState.state,
    subState: historicalState.subState,
  }
}

const mapHistoricalStates = (historicalStates:Array<HistoricalState>):Array<HistoricalStateDto> => {
  return historicalStates.map(state => mapHistoricalState(state));
}

const map = (statefulEntity:StatefulEntity):StatefulEntityDto => {
  const entityDto:EntityDto = entityDtoMapper.map(statefulEntity);
  return {
    ...entityDto,
    dateStateStarted: timestampToMoment(statefulEntity.dateStateStarted),
    state: statefulEntity.state,
    subState: statefulEntity.subState,
    history: mapHistoricalStates(statefulEntity.history),
  }
}

export const statefulEntityDtoMapper = {
  map,
}