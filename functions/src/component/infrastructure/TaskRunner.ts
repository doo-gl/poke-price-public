import moment from "moment/moment";
import {ConcurrentPromiseQueue} from "../tools/ConcurrentPromiseQueue";
import {handleAllErrors} from "../tools/AllPromiseHandler";
import {logger} from "firebase-functions";

export interface Task {
  doTask:() => Promise<void>,
  id:string
}

const runFor = async (
  periodInSeconds:number,
  maxConcurrentTasks:number,
  taskSupplier:() => Promise<Task|null>,
  errorHandler:(err:any) => void
):Promise<void> => {
  const start = moment();
  const promiseQueue = new ConcurrentPromiseQueue<void>(maxConcurrentTasks);
  const finish = moment().add(periodInSeconds, 'seconds');
  let completedTaskCount = 0;
  let erroredTaskCount = 0;

  const pullTask = async ():Promise<void> => {
    const hasPeriodElapsed = finish.isBefore(moment());
    if (hasPeriodElapsed) {
      // logger.info(`Stopping as ${finish.toISOString()} has been reached`)
      return;
    }
    const pulledTask = await taskSupplier();
    if (!pulledTask) {
      // logger.info(`Stopping as no new task has been pulled`)
      return;
    }
    try {
      // logger.info(`Starting new task, ${pulledTask.id}, currently running ${promiseQueue.numberOfExecutingPromises()}, tasks with ${promiseQueue.numberOfQueuedPromises()} queued`)
      await promiseQueue.addPromise(() => pulledTask.doTask());
      completedTaskCount++;
    } catch (err:any) {
      errorHandler(err);
      erroredTaskCount++;
    }
    await pullTasksUpToLimit();
  }

  const pullTasksUpToLimit = async ():Promise<void> => {
    const queuedTasks = promiseQueue.numberOfExecutingPromises() + promiseQueue.numberOfQueuedPromises();
    const tasksToAdd = maxConcurrentTasks - queuedTasks;
    const taskPromises:Array<Promise<void>> = [];
    for (let taskCount = 0; taskCount < tasksToAdd; taskCount++) {
      taskPromises.push(pullTask())
    }
    await handleAllErrors(taskPromises, 'Error while processing tasks')
  }

  await pullTasksUpToLimit()

  const now = moment();
  const timeTaken = now.diff(start, 'seconds')
  logger.info(`Processed ${completedTaskCount + erroredTaskCount} tasks in ${timeTaken}s, ${completedTaskCount} complete, ${erroredTaskCount} errored.`)
}

export const taskRunner = {
  runFor,
}