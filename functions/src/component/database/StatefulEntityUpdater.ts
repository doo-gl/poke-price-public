import {HistoricalState, StatefulEntity} from "./StatefulEntity";
import {LoadingState} from "../constants/LoadingState";
import {BaseCrudRepository} from "./BaseCrudRepository";

import {logger} from "firebase-functions";
import {timestampToMoment} from "../tools/TimeConverter";
import {EntityUpdater, entityUpdaterFactory} from './EntityUpdaterFactory'
import {Update} from "./Entity";
import {byIdRetriever} from "./ByIdRetriever";
import {TimestampStatic} from "../external-lib/Firebase";


export class StatefulEntityUpdater<T extends StatefulEntity> implements EntityUpdater<T> {

  private updater:EntityUpdater<T>

  constructor(
    private readonly repository:BaseCrudRepository<T>
  ) {
    this.updater = entityUpdaterFactory.build(
      repository,
      repository.collectionName
    )
  }

  async updateState(
    entity:T,
    newState:LoadingState,
    newSubState:string,
    newDetail:object
  ):Promise<void> {
    const newHistoricalState:HistoricalState = {
      state: newState,
      subState: newSubState,
      detail: newDetail,
      dateStateStarted: TimestampStatic.now(),
    };
    const newHistory = entity.history;
    newHistory.push(newHistoricalState);
    // basically forcing the type system to accept this partial stateful entity to be created
    // @ts-ignore
    const updateEntity:Partial<T> = {
      state: newHistoricalState.state,
      subState: newHistoricalState.subState,
      dateStateStarted: newHistoricalState.dateStateStarted,
      history: newHistory,
    };
    const dateStateStarted = timestampToMoment(updateEntity.dateStateStarted!);
    logger.info(`Updating state of entity with id: ${entity.id} to ${updateEntity.state}|${updateEntity.subState} at ${dateStateStarted.toISOString()}`)
    await this.updater.updateOnly(entity.id, updateEntity)
  }

  async updateStateAndReturn(
    entity:T,
    newState:LoadingState,
    newSubState:string,
    newDetail:object
  ):Promise<T> {
    await this.updateState(entity, newState, newSubState, newDetail)
    return byIdRetriever.retrieve(
      this.repository,
      entity.id,
      this.repository.collectionName
    )

  }

  merge(id: string, update: Update<T>): Promise<T> {
    return this.updater.merge(id, update)
  }

  /** @deprecated **/
  update(id: string, update: Update<T>): Promise<T> {
    return this.updater.update(id, update)
  }

  updateAndReturn(id: string, update: Update<T>): Promise<T> {
    return this.updater.updateAndReturn(id, update)
  }

  updateOnly(id: string, update: Update<T>): Promise<void> {
    return this.updater.updateOnly(id, update)
  }

}

export const build = <T extends StatefulEntity>(repository:BaseCrudRepository<T>):StatefulEntityUpdater<T> => {
  return new StatefulEntityUpdater<T>(repository);
}