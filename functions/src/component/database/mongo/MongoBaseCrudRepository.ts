import {AggregateOptions, Collection, Document, Filter, FindOptions, ObjectId, WithId} from "mongodb";
import {MongoConnectionManager} from "./MongoConnectionManager";
import {BatchUpdate, Create, MongoEntity, Update} from "./MongoEntity";
import {mongoDocumentCreator} from "./MongoDocumentCreator";
import {logger} from "firebase-functions";
import {promiseChainExecutor} from "../../tools/PromiseChainExecutor";
import {handleAllErrors} from "../../tools/AllPromiseHandler";
import {dedupe} from "../../tools/ArrayDeduper";

export interface RepositoryOperationStats {
  collectionName:string,
  numberOfReads?:number,
  numberOfWrites?:number,
  numberOfDeletes?:number,
}

export class MongoBaseCrudRepository<T extends MongoEntity> {

  constructor(
    private readonly connectionManager:MongoConnectionManager,
    readonly collectionName:string,
    private readonly statLogger:(stats:RepositoryOperationStats) => void,
  ) {

  }

  async getCollection():Promise<Collection> {
    const connection = await this.connectionManager.getConnection()
    return connection.db.collection(this.collectionName);
  }

  async getOne(id:ObjectId):Promise<T|null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: id })
      .then((result:WithId<Document>|null) => {
        this.statLogger({ collectionName: this.collectionName, numberOfReads: 1 });
        if (!result) {
          return null;
        }
        return result as T;
      })
  }

  async getOneByLegacyId(id:string):Promise<T|null> {
    const collection = await this.getCollection();
    return collection.findOne({ legacyId: id })
      .then((result:WithId<Document>|null) => {
        this.statLogger({ collectionName: this.collectionName, numberOfReads: 1 });
        if (!result) {
          return null;
        }
        return result as T;
      })
  }

  async getOneByMaybeLegacyId(id:string):Promise<T|null> {
    if (ObjectId.isValid(id)) {
      return this.getOne(new ObjectId(id))
    } else {
      return this.getOneByLegacyId(id)
    }
  }

  async count(filter: Filter<T>):Promise<number> {
    const collection = await this.getCollection();
    const result = await collection.countDocuments(filter);
    // this.statLogger({ collectionName: this.collectionName, numberOfReads: result });
    return result;
  }

  async getMany(
    filter:Filter<T>,
    options?:FindOptions
  ):Promise<Array<T>> {
    const collection = await this.getCollection();
    const results = await collection.find(
      filter,
      options
    ).toArray()
    this.statLogger({ collectionName: this.collectionName, numberOfReads: results.length });
    return results as Array<T>
  }

  async aggregate(pipeline?: Document[], options?: AggregateOptions) {
    const collection = await this.getCollection();
    const results = await collection.aggregate(pipeline, options).toArray()
    return results;
  }

  async getManyById(ids:Array<ObjectId>):Promise<Array<T>> {
    if (ids.length === 0) {
      return []
    }
    const collection = await this.getCollection();
    const results = await collection.find(
      { _id: { $in: ids } }
    ).toArray()
    this.statLogger({ collectionName: this.collectionName, numberOfReads: results.length });
    return results as Array<T>
  }

  async getManyByLegacyId(legacyIds:Array<string>):Promise<Array<T>> {
    if (legacyIds.length === 0) {
      return []
    }
    const collection = await this.getCollection();
    const results = await collection.find(
      { legacyId: { $in: legacyIds } }
    ).toArray()
    this.statLogger({ collectionName: this.collectionName, numberOfReads: results.length });
    return results as Array<T>
  }

  async getManyByMaybeLegacyIds (ids:Array<string>):Promise<Array<T>> {
    const legacyIds:Array<string> = [];
    const objectIds:Array<ObjectId> = [];
    ids.forEach(id => {
      if (ObjectId.isValid(id)) {
        objectIds.push(new ObjectId(id))
      } else {
        legacyIds.push(id)
      }
    })
    const byLegacyIds = async ():Promise<Array<T>> => {
      return legacyIds.length > 0 ? this.getManyByLegacyId(legacyIds) : []
    }
    const byObjectIds = async ():Promise<Array<T>> => {
      return objectIds.length > 0 ? this.getManyById(objectIds) : []
    }
    const results = await Promise.all([
      byLegacyIds(),
      byObjectIds(),
    ])
    const entities = results[0].concat(results[1])
    return dedupe(entities, entity => entity._id.toString())
  }

  async createOnly(value:Create<T>):Promise<void> {
    const collection = await this.getCollection();
    const document = mongoDocumentCreator.create<T>(value);
    await collection.insertOne(document)
    this.statLogger({ collectionName: this.collectionName, numberOfWrites: 1 });
  }

  async createAndReturn(value:Create<T>):Promise<T> {
    const collection = await this.getCollection();
    const document = mongoDocumentCreator.create<T>(value);
    const insertResult = await collection.insertOne(document)
    this.statLogger({ collectionName: this.collectionName, numberOfWrites: 1 });
    const newDocument = await this.getOne(insertResult.insertedId)
    return newDocument as T
  }

  async batchCreate(creates:Array<Create<T>>):Promise<number> {
    if (creates.length === 0) {
      return 0;
    }
    const start = new Date()
    logger.info(`Batch creating ${creates.length} ${this.collectionName}`)
    const collection = await this.getCollection();
    const documents = creates.map(mongoDocumentCreator.create);
    const bulkResult = await collection.insertMany(documents)
    const end = new Date()
    logger.info(`Batch created ${creates.length} ${this.collectionName} took: ${end.getTime() - start.getTime()}ms`)
    const insertedCount = bulkResult.insertedCount;
    this.statLogger({ collectionName: this.collectionName, numberOfWrites: insertedCount });
    return insertedCount;
  }

  async updateOnly(id:ObjectId, value:Update<T>):Promise<void> {
    const collection = await this.getCollection();
    const document = mongoDocumentCreator.update(value);
    const updateResult = await collection.updateOne({ _id: id }, { $set: document })
    this.statLogger({ collectionName: this.collectionName, numberOfReads: updateResult.matchedCount, numberOfWrites: updateResult.modifiedCount });
  }

  async updateAndReturn(id:ObjectId, value:Update<T>):Promise<T|null> {
    const collection = await this.getCollection();
    const document = mongoDocumentCreator.update(value);
    const updateResult = await collection.updateOne({ _id: id }, { $set: document })
    this.statLogger({ collectionName: this.collectionName, numberOfReads: updateResult.matchedCount, numberOfWrites: updateResult.modifiedCount });
    if (updateResult.matchedCount === 0) {
      return null;
    }
    return this.getOne(id)
  }

  async batchUpdate(updates:Array<BatchUpdate<T>>):Promise<number> {
    if (updates.length === 0) {
      return 0;
    }
    const start = new Date()
    // logger.debug(`Batch updating ${updates.length} ${this.collectionName}`)
    const collection = await this.getCollection();
    const documents = updates.map(update => ({
      id: update.id,
      document: mongoDocumentCreator.update(update.update),
    }));
    const bulkResult = await collection.bulkWrite(
      // @ts-ignore
      documents.map(document => ({
        updateOne: {filter: { _id: document.id }, update: { $set: document.document }},
      })),
      { ordered: false }
    )
    const end = new Date()
    // logger.debug(`Batch updated ${updates.length} ${this.collectionName} took: ${end.getTime() - start.getTime()}ms`)
    // @ts-ignore
    this.statLogger({ collectionName: this.collectionName, numberOfReads: bulkResult.matchedCount, numberOfWrites: bulkResult.modifiedCount });
    // @ts-ignore
    const modifiedCount = bulkResult.modifiedCount;
    return modifiedCount;
  }

  async delete(id:ObjectId):Promise<boolean> {
    const collection = await this.getCollection();
    const deleteResult = await collection.deleteOne({_id: id})
    this.statLogger({ collectionName: this.collectionName, numberOfDeletes: deleteResult.deletedCount });
    return deleteResult.deletedCount > 0;
  }

  async batchDelete(ids:Array<ObjectId>):Promise<number> {
    if (ids.length === 0) {
      return 0;
    }
    const collection = await this.getCollection();
    const deleteResult = await collection.deleteMany({ _id: { $in: ids } })
    const deletedCount = deleteResult.deletedCount;
    this.statLogger({ collectionName: this.collectionName, numberOfDeletes: deleteResult.deletedCount });
    return deletedCount;
  }

  iterator():CollectionIterator<T> {
    return new CollectionIterator<T>(this)
  }
}

export interface IteratorResult {
  totalNumberOfResults: number,
  lastProcessedId:string|null,
  finished:boolean,
}

export class CollectionIterator<T extends MongoEntity> {

  private _pageSize = 500;
  private _options?:FindOptions<T> = undefined;
  private _filter:Filter<T> = {};
  private _startFromPageIndex:number|null = null;

  constructor(
    readonly repo:MongoBaseCrudRepository<T>
  ) {}

  filter(filter:Filter<T>):CollectionIterator<T> {
    this._filter = filter;
    return this;
  }

  pageSize(pageSize:number):CollectionIterator<T> {
    this._pageSize = pageSize;
    return this;
  }

  options(options:FindOptions<T>):CollectionIterator<T> {
    this._options = options;
    return this;
  }

  startFromPageIndex(startFromPageIndex:number):CollectionIterator<T> {
    this._startFromPageIndex = startFromPageIndex;
    return this;
  }

  async iterateBatch(entityBatchConsumer:(entities:Array<T>) => Promise<boolean|void>):Promise<IteratorResult>  {
    logger.info(`Iterating over ${this.repo.collectionName} in batches of ${this._pageSize}.`)
    let totalNumberOfResults = 0;
    const lastProcessedId:string|null = null;
    const finished = false;
    const resultCount = await this.repo.count(this._filter)

    const promiseSupplier = async (startProcessingFromPageIndex:number|null):Promise<number|null> => {
      let pageIndex = 0;
      if (startProcessingFromPageIndex) {
        pageIndex = startProcessingFromPageIndex;
      } else if (this._startFromPageIndex) {
        pageIndex = this._startFromPageIndex;
      }
      const limit = Math.floor(this._pageSize);

      const queryOptions:FindOptions<T> = this._options ?? {};
      queryOptions.limit = limit;
      queryOptions.skip = limit * pageIndex;
      const batchOfEntities:Array<T> = await this.repo.getMany(
        this._filter, queryOptions
      );

      logger.info(`Processing entities ${totalNumberOfResults > 0 ? totalNumberOfResults + 1 : 0} to ${totalNumberOfResults + batchOfEntities.length}`);
      totalNumberOfResults += batchOfEntities.length;

      const exit = await entityBatchConsumer(batchOfEntities);

      if (exit) {
        return null;
      }

      const processedAllEntities = batchOfEntities.length === 0 || totalNumberOfResults >= resultCount;
      if (processedAllEntities) {
        return null;
      }

      return pageIndex + 1;
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