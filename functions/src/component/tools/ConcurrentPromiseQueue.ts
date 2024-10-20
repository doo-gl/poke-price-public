import moment, {Moment} from "moment";
import {uuid} from "../external-lib/Uuid";

export type PromiseSupplier<T> = () => Promise<T>;

type PromiseExecutionListener<T> = (result:FinishedPromiseResult<T>) => void;
interface FinishedPromiseResult<T> {
  isSuccess:boolean,
  result:T|null,
  error:any,
}
interface QueuedPromise<T> {
  id:string,
  promiseSupplier:PromiseSupplier<T>
}

export class ConcurrentPromiseQueue<T> {
  private promisesToExecute:Array<QueuedPromise<T>>;
  private promisesBeingExecuted:{[id:string]: QueuedPromise<T>};
  private promiseExecutedCallbacks:{[id:string]:PromiseExecutionListener<T>};
  private promiseCompletedTimesLog:Moment[];
  private reattemptTimeoutId:any|null;

  constructor(
    readonly maxNumberOfConcurrentPromises:number = 100,
    readonly unitOfTimeMillis:number = 100,
    readonly maxThroughputPerUnitTime:number = 100
  ) {
    this.promisesToExecute = [];
    this.promisesBeingExecuted = {};
    this.promiseExecutedCallbacks = {};
    this.promiseCompletedTimesLog = [];
    this.reattemptTimeoutId = null;
  }

  numberOfQueuedPromises():number {
    return this.promisesToExecute.length
  }

  numberOfExecutingPromises():number {
    return Object.keys(this.promisesBeingExecuted).length;
  }

  /**
   * Give a promise supplier that will be called to provide it's promise when the queue is ready to process it.
   * Return a promise that will resolve / reject with the result of running the promise that was supplied.
   * @param promiseSupplier
   */
  addPromise(promiseSupplier:PromiseSupplier<T>):Promise<T|null> {
    // return a promise that will complete when the promise from the promise supplier has been run.
    return new Promise(((resolve, reject) => {
      // add the promise to list of promises to be executed and also register a callback with the same id
      // so that when this promise has been executed, we can call the callback and resolve the promise to return to the caller
      const id = uuid();
      this.promisesToExecute.push({
        id,
        promiseSupplier,
      });
      this.promiseExecutedCallbacks[id] = (result:FinishedPromiseResult<T>) => {
        if (result.isSuccess) {
          resolve(result.result);
        } else {
          reject(result.error);
        }
      };
      // call execute to kick off the processing of promises if it hasn't already started.
      this.execute();
    }));
  }

  execute():void {
    // check to see if we have anything to execute
    if (this.promisesToExecute.length === 0) {
      return;
    }

    // check to see how many promises have been run in the last unit of time
    const now:Moment = moment();
    const startOfTimeUnit:Moment = moment().subtract(this.unitOfTimeMillis, 'ms');
    const promisesFinishedInLastUnitTime:Array<Moment> = this.promiseCompletedTimesLog.filter(time => {
      return time.isSameOrAfter(startOfTimeUnit);
    });
    const numberOfPromisesFinishedInLastUnitTime:number = promisesFinishedInLastUnitTime.length;
    const numberOfPromisesBeingExecuted:number = Object.keys(this.promisesBeingExecuted).length;
    const numberOfPromisesLeftInConcurrencyLimit:number = this.maxNumberOfConcurrentPromises - numberOfPromisesBeingExecuted;
    const numberOfPromisesLeftInRateLimit:number = this.maxThroughputPerUnitTime - numberOfPromisesFinishedInLastUnitTime;
    const numberOfPromisesToStart:number = Math.min(numberOfPromisesLeftInConcurrencyLimit, numberOfPromisesLeftInRateLimit);
    if (numberOfPromisesToStart <= 0) {
      // if we are not starting any more promises, we should check to see if we are going to start more later
      if (!this.reattemptTimeoutId) {
        // given we are in the situation where no more promises are being started, we need to decide how long to wait
        const periodToWaitToReattemptPromisesMillis:number = numberOfPromisesFinishedInLastUnitTime > 0
          ? now.diff(promisesFinishedInLastUnitTime[0])
          : this.unitOfTimeMillis;
        this.reattemptTimeoutId = setTimeout(() => {
          this.reattemptTimeoutId = null;
          this.execute();
        }, periodToWaitToReattemptPromisesMillis);
      }

      return;
    }
    // if we can run more promises, run more promises until we hit the max or run out of promises
    for (let count = 0; count < numberOfPromisesToStart; count++) {
      const nextPromiseToStart:QueuedPromise<T>|undefined = this.promisesToExecute.shift();
      if (!nextPromiseToStart) {
        return;
      }
      const id = nextPromiseToStart.id;
      const promiseExecutionListener = this.promiseExecutedCallbacks[id];
      if (!promiseExecutionListener) {
        continue;
      }
      this.promisesBeingExecuted[id] = nextPromiseToStart;
      // logger.info(`Starting promise with id: ${id}`);
      // run the promise and pass the result back to the callback associated with this promise
      nextPromiseToStart.promiseSupplier()
        .then(res => {
          delete this.promiseExecutedCallbacks[id];
          delete this.promisesBeingExecuted[id];
          promiseExecutionListener({
            isSuccess: true,
            result: res,
            error: null,
          });
        })
        .catch(err => {
          delete this.promiseExecutedCallbacks[id];
          delete this.promisesBeingExecuted[id];
          promiseExecutionListener({
            isSuccess: false,
            result: null,
            error: err,
          });
        })
        .finally(() => {
          // logger.info(`Finished promise with id: ${id}`);

          // eslint-disable-next-line no-shadow
          const now:Moment = moment();
          // eslint-disable-next-line no-shadow
          const startOfTimeUnit:Moment = moment().subtract(this.unitOfTimeMillis, 'ms');
          this.promiseCompletedTimesLog.push(now);
          this.promiseCompletedTimesLog = this.promiseCompletedTimesLog.filter(time => {
            return time.isSameOrAfter(startOfTimeUnit);
          });
          this.execute();
        });
    }
  }

}