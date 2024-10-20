import {Task} from "./TaskRunner";
import {InvalidArgumentError} from "../error/InvalidArgumentError";


export class TaskSupplierBuilder<T> {

  private _idMapper: ((item: T) => string) | null = null;
  private _dataName = 'item';
  private _itemRetriever: ((limit: number) => Promise<Array<T>>) | null = null;
  private _minItemCount = 5;
  private _queueScale = 2;
  private _taskMapper: (item: T) => Promise<void> = () => Promise.resolve();

  idMapper(idMapper: (item: T) => string): TaskSupplierBuilder<T> {
    this._idMapper = idMapper;
    return this;
  }

  dataName(dataName: string): TaskSupplierBuilder<T> {
    this._dataName = dataName;
    return this;
  }

  itemRetriever(itemRetriever: ((limit: number) => Promise<Array<T>>)): TaskSupplierBuilder<T> {
    this._itemRetriever = itemRetriever;
    return this;
  }

  minItemCount(minItemCount: number): TaskSupplierBuilder<T> {
    this._minItemCount = minItemCount;
    return this;
  }

  queueScale(queueScale: number): TaskSupplierBuilder<T> {
    this._queueScale = queueScale;
    return this;
  }

  taskMapper(taskMapper: (item: T) => Promise<void>): TaskSupplierBuilder<T> {
    this._taskMapper = taskMapper;
    return this;
  }

  build(): () => Promise<Task | null> {
    if (!this._idMapper) {
      throw new InvalidArgumentError(`Id mapper must be set`)
    }
    const idMapper = this._idMapper;
    if (!this._itemRetriever) {
      throw new InvalidArgumentError(`Item retriever must be set`)
    }
    const itemRetriever = this._itemRetriever;

    const pulledItemIds = new Set<string>();
    let itemQueue: Array<T> = [];
    let refreshQueuePromise: Promise<void> | null = null;

    const getNextItem = ():T | null => {
      // try pull an item from the current queue
      const itemsThatHaveNotBeenPulled = itemQueue.filter(item => !pulledItemIds.has(idMapper(item)));
      if (itemsThatHaveNotBeenPulled.length > 0) {
        const nextItem = itemsThatHaveNotBeenPulled[0];
        const nextItemId = idMapper(nextItem)
        itemQueue = itemQueue.filter(item => idMapper(item) !== nextItemId);
        pulledItemIds.add(nextItemId);
        // logger.info(`Next ${this._dataName} is ${nextItemId}, queue size at: ${itemQueue.length}`)
        return nextItem;
      }
      // logger.info(`No next ${this._dataName} is available, queue size at: ${itemQueue.length}`)
      // logger.info(`No next ${this._dataName} is available, queue size at: ${itemQueue.length}`, pulledItemIds, itemQueue.map(idMapper))
      return null;
    }

    const refreshQueue = async (): Promise<void> => {
      if (refreshQueuePromise) {
        return refreshQueuePromise;
      }
      refreshQueuePromise = itemRetriever(this._queueScale * this._minItemCount)
        .then(items => {
          // logger.info(`Queue refreshed with ${items.length} items`)
          itemQueue = items;
        })
      // logger.info(`Refreshing queue`)
      await refreshQueuePromise;
      refreshQueuePromise = null;
    }

    return async () => {
      if (itemQueue.length <= this._minItemCount) {
        await refreshQueue();
      }

      const item = getNextItem();

      if (!item) {
        return null;
      }

      const task:Task = {
        id: idMapper(item),
        doTask: () => this._taskMapper(item),
      }
      return task;
    }
  }

}