import moment, {Moment} from "moment";

export interface ExecutedPromise<T> {
  id:string,
  startedAt:Moment,
  finishedAt:Moment|null,
  promiseSupplier:() => Promise<T>,
  data:T|null,
  error:any|null,
}

export type ExecutedPromises<T> = { [id:string]: ExecutedPromise<T> };

export class MultiPromiseExecutor<T> {

  readonly executedPromises:ExecutedPromises<T> = {};

  async execute(id:string, promiseSupplier:() => Promise<T>):Promise<ExecutedPromises<T>> {
    const startedAt = moment();
    this.executedPromises[id] = {
      id,
      startedAt,
      finishedAt: null,
      promiseSupplier,
      data: null,
      error: null,
    }
    try {
      const data = await promiseSupplier();
      if (this.executedPromises[id]) {
        this.executedPromises[id].data = data;
        this.executedPromises[id].finishedAt = moment();
      }
    } catch (err) {
      if (this.executedPromises[id]) {
        this.executedPromises[id].error = err;
        this.executedPromises[id].finishedAt = moment();
      }
    }
    return this.executedPromises;
  }

  removeAllButId(idToKeep:string) {
    const idsToRemove = Object.keys(this.executedPromises).filter(id => id !== idToKeep);
    idsToRemove.forEach(idToRemove => {
      delete this.executedPromises[idToRemove];
    })
  }

}