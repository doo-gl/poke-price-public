import {uuid} from "../external-lib/Uuid";
import {Create, Entity, Update} from "./Entity";
import {logger} from "firebase-functions";
import {promiseChainExecutor} from "../tools/PromiseChainExecutor";
import {handleAllErrors} from "../tools/AllPromiseHandler";
import {flattenArray} from "../tools/ArrayFlattener";
import {batchArray} from "../tools/ArrayBatcher";
import {CollectionReference, DocumentData, FieldValue, Firestore} from "../external-lib/Firebase";

export interface Query<T> {
  field:Extract<keyof T, string>|string,
  operation:FirebaseFirestore.WhereFilterOp,
  value:any,
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export interface Sort<T> {
  field:Extract<keyof T, string>|string,
  order:SortOrder,
}

export interface QueryOptions<T> {
  limit?:number,
  sort?:Array<Sort<T>>,
  startAfterId?:string,
  startAtId?:string,
}

export interface BatchUpdate<T extends Entity> {
  id:string,
  update:Update<T>|object
}

export interface RepositoryOperationStats {
  collectionName:string,
  numberOfReads?:number,
  numberOfWrites?:number,
  numberOfDeletes?:number,
}

export const MAX_ALLOWED_IN_IN_CLAUSE = 10;

export interface FirestoreBaseCrudRepository<T extends Entity> {
  collectionName:string,
  getOne(id:string):Promise<T|null>,
  getMany(queries:Array<Query<T>>, queryOptions?:QueryOptions<T>|null|undefined):Promise<Array<T>>
  getManyById(ids:Array<string>):Promise<Array<T>>
  iterator():CollectionIterator<T>,
  create(value:Omit<T,keyof Entity>):Promise<T>,
  batchCreate(creates:Array<Create<T>>):Promise<number>,
  batchCreateAndReturn(creates:Array<Create<T>>):Promise<{ids:Array<string>}>,
  updateOne(id:string, value:Update<T>):Promise<T|null>,
  update(id:string, value:Update<T>):Promise<void>,
  updateAndReturn(id:string, value:Update<T>):Promise<T|null>,
  mergeOne(id:string, value:Update<T>):Promise<T|null>,
  batchUpdate(updates:Array<BatchUpdate<T>>):Promise<number>,
  delete(id:string):Promise<boolean>,
  batchDelete(ids:Array<string>):Promise<number>,
}

export class BaseCrudRepository<T extends Entity> implements FirestoreBaseCrudRepository<T>{

  private readonly collection:CollectionReference<any>;

  constructor(
    readonly db:Firestore,
    readonly collectionName:string,
    readonly converter:(data:DocumentData|undefined) => T|null,
    readonly statLogger:(stats:RepositoryOperationStats) => void,
  ) {
    this.collection = db.collection(collectionName)
  }

  getFirebaseCollection():CollectionReference<any> {
    return this.collection
  }

  getFirestoreDatabase():Firestore {
    return this.db
  }

  convert(data:DocumentData|undefined):T|null {
    return this.converter(data)
  }

  async getOne(id:string):Promise<T|null> {
    return this.collection.doc(id).get()
      .then((result) => {
        this.statLogger({ collectionName: this.collectionName, numberOfReads: 1 });
        return this.converter(result.data());
      })
  }

  async getMany(
    queries:Array<Query<T>>,
    queryOptions:QueryOptions<T>|null = null
  ):Promise<Array<T>> {
    if (queries.length === 0) {
      logger.warn(`Query with no params on ${this.collectionName}`)
    }
    let reference:FirebaseFirestore.Query = this.collection;
    queries.forEach((query:Query<T>) => {
      reference = reference.where(query.field, query.operation, query.value);
    })
    if (queryOptions && queryOptions.sort && queryOptions.sort.length > 0) {
      queryOptions.sort.forEach(sort => {
        reference = reference.orderBy(sort.field, sort.order);
      });
    }
    if (queryOptions && queryOptions.limit) {
      reference = reference.limit(queryOptions.limit);
    }
    if (queryOptions && queryOptions.startAfterId) {
      const startAfterSnapshot = await this.collection.doc(queryOptions.startAfterId).get();
      reference = reference.startAfter(startAfterSnapshot);
    }
    if (queryOptions && queryOptions.startAtId) {
      const endAtSnapshot = await this.collection.doc(queryOptions.startAtId).get();
      reference = reference.startAt(endAtSnapshot);
    }
    return reference.get()
      .then(results => {
        const reads = results.size > 0 ? results.size : 1; // queries that return 0 results still count as one read.
        this.statLogger({ collectionName: this.collectionName, numberOfReads: reads});
        const foo = results.docs.map(snapshot => this.converter(snapshot.data()));
        return <T[]>foo;
      })
  }

  async getManyById(ids:Array<string>):Promise<Array<T>> {
    const idBatches:Array<Array<string>> = batchIds(ids)
    const resultBatches:Array<Array<T>> = await Promise.all(
      idBatches.map((idBatch) => this.getMany([{ field: "id", operation: "in", value: idBatch }])),
    );
    const results = flattenArray(resultBatches);
    return results;
  }

  iterator():CollectionIterator<T> {
    return new CollectionIterator<T>(this);
  }

  mapCreateToEntity(value:Omit<T,keyof Entity>):Entity {
    const id = uuid();
    const dateCreated = FieldValue.serverTimestamp();
    const dateLastModified = FieldValue.serverTimestamp();
    // @ts-ignore
    return  {...value, id, dateCreated, dateLastModified};
  }

  async create(value:Omit<T,keyof Entity>):Promise<T> {
    const entity = this.mapCreateToEntity(value)
    return this.collection.doc(entity.id).set(entity)
      .then((result) => {
        this.statLogger({ collectionName: this.collectionName, numberOfWrites: 1});
        return <Promise<T>>this.getOne(entity.id);
      });
  }

  async batchCreate(creates:Array<Create<T>>):Promise<number> {
    const result = await this.batchCreateAndReturn(creates)
    return result.ids.length
  }

  async batchCreateAndReturn(creates:Array<Create<T>>):Promise<{ids:Array<string>}> {
    const batchedCreates = batchArray(creates, 500)
    const ids:Array<string> = []

    const submitBatch = async (createBatch:Array<Create<T>>) => {
      const batch = this.db.batch();
      createBatch.forEach(create => {
        const entity = this.mapCreateToEntity(create)
        ids.push(entity.id)
        const docRef = this.collection.doc(entity.id);
        batch.create(docRef, entity);
      });
      const results = await batch.commit();
      this.statLogger({ collectionName: this.collectionName, numberOfWrites: results.length});
    }

    await Promise.all(
      batchedCreates.map(createBatch => submitBatch(createBatch))
    )

    return {ids};
  }

  async updateOne(id:string, value:Update<T>):Promise<T|null> {
    return this.getOne(id)
      .then(result => {
        if (!result) {
          return null;
        }
        const dateLastModified = FieldValue.serverTimestamp();
        const updateValue = { ...value, dateLastModified };
        return this.collection
          .doc(id)
          .update(updateValue)
          .then(updateResult => {
            this.statLogger({ collectionName: this.collectionName, numberOfWrites: 1});
            return this.getOne(id);
          })
      })
      .catch(err => {
        if (err?.message?.match("Update() requires either a single JavaScript")) {
          logger.error(`Failed to update for id: ${id} with object: ${value}`)
        }
        throw err
      })
  }

  async updateOnlyInTransaction(id:string, value:Update<T>):Promise<void> {
    await this.db.runTransaction(async transaction => {
      const docRef = this.collection.doc(id)
      const result = await transaction.get(docRef)
      if (!result) {
        return
      }
      const dateLastModified = FieldValue.serverTimestamp();
      const updateValue = { ...value, dateLastModified };
      await transaction.update(docRef, updateValue)
      this.statLogger({ collectionName: this.collectionName, numberOfWrites: 1});
    })
  }

  async update(id:string, value:Update<T>):Promise<void> {
    const dateLastModified = FieldValue.serverTimestamp();
    const updateValue = { ...value, dateLastModified };
    return this.collection
      .doc(id)
      .update(updateValue)
      .then(updateResult => {
        this.statLogger({ collectionName: this.collectionName, numberOfWrites: 1});
      })
      .catch(err => {
        if (err?.message?.match("Update() requires either a single JavaScript")) {
          logger.error(`Failed to update for id: ${id} with object: ${value}`)
        }
        throw err
      })
  }

  async updateAndReturn(id:string, value:Update<T>):Promise<T|null> {
    return this.getOne(id)
      .then(result => {
        if (!result) {
          return null;
        }
        const dateLastModified = FieldValue.serverTimestamp();
        const updateValue = { ...value, dateLastModified };
        return this.collection
          .doc(id)
          .update(updateValue)
          .then(updateResult => {
            this.statLogger({ collectionName: this.collectionName, numberOfWrites: 1});
            return this.getOne(id);
          })
      })
      .catch(err => {
        if (err?.message?.match("Update() requires either a single JavaScript")) {
          logger.error(`Failed to update for id: ${id} with object: ${value}`)
        }
        throw err
      })
  }

  async mergeOne(id:string, value:Update<T>):Promise<T|null> {
    return this.getOne(id)
      .then(result => {
        if (!result) {
          return null;
        }
        const dateLastModified = FieldValue.serverTimestamp();
        const updateValue = { ...value, dateLastModified };
        return this.collection
          .doc(id)
          .set(updateValue, { merge: true })
          .then(updateResult => {
            this.statLogger({ collectionName: this.collectionName, numberOfWrites: 1});
            return this.getOne(id);
          })
      })
  }

  async batchUpdate(updates:Array<BatchUpdate<T>>):Promise<number> {
    const batchedUpdates = batchArray(updates, 500)
    let count = 0

    const submitBatch = async (updateBatch:Array<BatchUpdate<T>>) => {
      const batch = this.db.batch();
      updateBatch.forEach(update => {
        const updateDocRef = this.collection.doc(update.id);
        batch.update(updateDocRef, update.update);
      });
      const results = await batch.commit();
      this.statLogger({ collectionName: this.collectionName, numberOfWrites: results.length});
      count += results.length
    }

    await Promise.all(
      batchedUpdates.map(updateBatch => submitBatch(updateBatch))
    )

    return count
  }

  async delete(id:string):Promise<boolean> {
    const entity:T|null = await this.getOne(id);
    if (!entity) {
      return false;
    }
    const result = await this.collection
      .doc(id)
      .delete();
    this.statLogger({ collectionName: this.collectionName, numberOfDeletes: 1});
    return true;
  }

  async batchDelete(ids:Array<string>):Promise<number> {
    const batch = this.db.batch();
    ids.forEach(id => {
      const updateDocRef = this.collection.doc(id);
      batch.delete(updateDocRef);
    });
    const results = await batch.commit();
    this.statLogger({ collectionName: this.collectionName, numberOfDeletes: results.length});
    return results.length;
  }

}

export interface IteratorResult {
  totalNumberOfResults: number,
  lastProcessedId:string|null,
  finished:boolean,
}

export class CollectionIterator<T extends Entity> {

  private _batchSize = 500;
  private _sort:Array<Sort<T>> = [];
  private _queries:Array<Query<T>> = [];
  private _startAfterId:string|null = null;
  private _withLogging:boolean = false;

  constructor(
    readonly repo:BaseCrudRepository<T>
  ) {}

  queries(queries:Array<Query<T>>):CollectionIterator<T> {
    this._queries = queries;
    return this;
  }

  withLogging():CollectionIterator<T> {
    this._withLogging = true
    return this
  }

  withoutLogging():CollectionIterator<T> {
    this._withLogging = false
    return this
  }

  batchSize(batchSize:number):CollectionIterator<T> {
    this._batchSize = batchSize;
    return this;
  }

  sort(sort:Array<Sort<T>>):CollectionIterator<T> {
    this._sort = sort;
    return this;
  }

  startAfterId(startAfterId:string|null):CollectionIterator<T> {
    this._startAfterId = startAfterId;
    return this;
  }

  async iterateBatch(entityBatchConsumer:(entities:Array<T>) => Promise<boolean|void>):Promise<IteratorResult>  {
    if (this._withLogging) {
      logger.info(`Iterating over ${this.repo.collectionName} in batches of ${this._batchSize}.`)
    }
    let totalNumberOfResults = 0;
    let lastProcessedId:string|null = null;
    let finished = false;
    const promiseSupplier = async (startProcessingAfterId:string|null):Promise<string|null> => {
      const limit = Math.floor(this._batchSize);
      const queryOptions:QueryOptions<T> = {
        limit,
        sort: this._sort,
      }
      if (startProcessingAfterId || this._startAfterId) {
        // @ts-ignore
        queryOptions.startAfterId = startProcessingAfterId || this._startAfterId;
      }
      const batchOfEntities:Array<T> = await this.repo.getMany(this._queries, queryOptions);
      const lastEntity = batchOfEntities[batchOfEntities.length - 1];
      const nextStartAfterId = batchOfEntities.length < limit ? null : lastEntity.id;
      lastProcessedId = batchOfEntities.length > 0 ? batchOfEntities[batchOfEntities.length - 1].id : lastProcessedId;
      if (!nextStartAfterId) {
        finished = true;
      }
      if (this._withLogging) {
        logger.info(`Processing entities ${totalNumberOfResults + 1} to ${totalNumberOfResults + batchOfEntities.length}`);
      }
      totalNumberOfResults += batchOfEntities.length;

      const exit = await entityBatchConsumer(batchOfEntities);

      if (exit) {
        return null;
      }

      return nextStartAfterId;
    }
    await promiseChainExecutor.execute(promiseSupplier)
    return {
      totalNumberOfResults,
      lastProcessedId,
      finished,
    };
  }

  async iterate(entityConsumer:(entity:T) => Promise<boolean|void>):Promise<IteratorResult> {
    return this.iterateBatch(
      async entities => {
        // at some point put some better error handling in here
        const exits = await handleAllErrors(
          entities.map(entity => entityConsumer(entity)),
          `Failed while iterating over ${this.repo.collectionName}`
        );
        return exits.some(exit => exit);
      }
    )

  }

}

export const batchIds = (ids:Array<string>):Array<Array<string>> => {
  return batchArray<string>(ids, MAX_ALLOWED_IN_IN_CLAUSE);
}