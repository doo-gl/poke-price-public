import {
  BaseCrudRepository,
  BatchUpdate,
  CollectionIterator,
  FirestoreBaseCrudRepository,
  Query,
  QueryOptions,
} from "./BaseCrudRepository";
import {Create, Entity, Update} from "./Entity";
import {
  BatchUpdate as MongoBatchUpdate,
  Create as MongoCreate,
  MongoEntity,
  Update as MongoUpdate,
} from "./mongo/MongoEntity";
import {MongoBaseCrudRepository} from "./mongo/MongoBaseCrudRepository";
import {logger} from "firebase-functions";
import {toInputValueMap} from "../tools/MapBuilder";
import {UnexpectedError} from "../error/UnexpectedError";

export interface Converter<F extends Entity, M extends MongoEntity> {
  convertCreate:(create:Create<F>) => MongoCreate<M>
  convertUpdate:(update:Update<F>) => MongoUpdate<M>
}

export class DoubleWritingBaseCrudRepo<F extends Entity, M extends MongoEntity> implements FirestoreBaseCrudRepository<F>{

  readonly collectionName:string;

  constructor(
    private readonly firebaseRepo:BaseCrudRepository<F>,
    private readonly mongoRepo:MongoBaseCrudRepository<M>,
    private readonly converter:Converter<F, M>,
  ) {
    this.collectionName = firebaseRepo.collectionName
  }

  async getOne(id:string):Promise<F|null> {
    return this.firebaseRepo.getOne(id)
  }

  async getMany(
    queries:Array<Query<F>>,
    queryOptions:QueryOptions<F>|null = null
  ):Promise<Array<F>> {
    return this.firebaseRepo.getMany(queries, queryOptions)
  }

  async getManyById(ids:Array<string>):Promise<Array<F>> {
    return this.firebaseRepo.getManyById(ids)
  }

  iterator():CollectionIterator<F> {
    return this.firebaseRepo.iterator()
  }

  async create(value:Create<F>):Promise<F> {
    const results = await Promise.all([
      this.firebaseRepo.create(value),
      this.mongoRepo.createAndReturn(this.converter.convertCreate(value)),
    ])
    const firebaseEntity = results[0];
    const mongoEntity = results[1];
    const legacyId = firebaseEntity.id;
    // @ts-ignore
    await this.mongoRepo.updateOnly(mongoEntity._id, {legacyId})
    return results[0];
  }

  async batchCreateAndReturn(creates:Array<Create<F>>):Promise<{ids:Array<string>}> {
    const firebaseResult = await this.firebaseRepo.batchCreateAndReturn(creates)
    const legacyIds = firebaseResult.ids;
    if (legacyIds.length !== creates.length) {
      throw new UnexpectedError(`Have ${legacyIds.length} legacy ids when expected ${creates.length}`)
    }
    const mongoCreates:Array<MongoCreate<M>> = []
    for (let createIndex = 0; createIndex < creates.length; createIndex++) {
      const create = creates[createIndex];
      const legacyId = legacyIds[createIndex];
      const mongoCreate = this.converter.convertCreate(create)
      // @ts-ignore
      mongoCreate.legacyId = legacyId;
      mongoCreates.push(mongoCreate)
    }
    await this.mongoRepo.batchCreate(mongoCreates)
    return firebaseResult;
  }

  async batchCreate(creates:Array<Create<F>>):Promise<number> {
    const result = await this.batchCreateAndReturn(creates)
    return result.ids.length;
  }

  async updateInMongo (updates:Array<{id:string, update:Update<F>}>) {
    const ids = updates.map(update => update.id)
    const mongoEntities = await this.mongoRepo.getManyByLegacyId(ids)
    const legacyIdToMongoEntity = toInputValueMap(mongoEntities, input => input.legacyId)
    const mongoUpdates:Array<MongoBatchUpdate<M>> = []
    updates.forEach(update => {
      const mongoEntity = legacyIdToMongoEntity.get(update.id);
      if (!mongoEntity) {
        // assume it hasn't been backfilled yet
        logger.warn(`Missing mongo entity with legacy id: ${update.id}, not updating it`)
        return;
      }
      const mongoUpdate = this.converter.convertUpdate(update.update);
      if (Object.keys(mongoUpdate).length === 0) {
        return;
      }
      mongoUpdates.push({ id: mongoEntity._id, update: mongoUpdate })
    })
    await this.mongoRepo.batchUpdate(mongoUpdates)
  }

  async deleteInMongo (deleteIds:Array<string>) {
    const mongoEntities = await this.mongoRepo.getManyByLegacyId(deleteIds)
    await this.mongoRepo.batchDelete(mongoEntities.map(ent => ent._id))
  }

  async updateOne(id:string, value:Update<F>):Promise<F|null> {
    const results = await Promise.all([
      this.firebaseRepo.updateOne(id, value),
      this.updateInMongo([{id, update: value}]),
    ])
    return results[0];
  }

  async update(id:string, value:Update<F>):Promise<void> {
    const results = await Promise.all([
      this.firebaseRepo.update(id, value),
      this.updateInMongo([{id, update: value}]),
    ])
    return results[0];
  }

  async updateAndReturn(id:string, value:Update<F>):Promise<F|null> {
    const results = await Promise.all([
      this.firebaseRepo.updateAndReturn(id, value),
      this.updateInMongo([{id, update: value}]),
    ])
    return results[0];
  }

  async mergeOne(id:string, value:Update<F>):Promise<F|null> {
    const results = await Promise.all([
      this.firebaseRepo.mergeOne(id, value),
      this.updateInMongo([{id, update: value}]),
    ])
    return results[0];
  }

  async batchUpdate(updates:Array<BatchUpdate<F>>):Promise<number> {
    const results = await Promise.all([
      this.firebaseRepo.batchUpdate(updates),
      this.updateInMongo(updates),
    ])
    return results[0];
  }

  async delete(id:string):Promise<boolean> {
    const results = await Promise.all([
      this.firebaseRepo.delete(id),
      this.deleteInMongo([id]),
    ])
    return results[0];
  }

  async batchDelete(ids:Array<string>):Promise<number> {
    const results = await Promise.all([
      this.firebaseRepo.batchDelete(ids),
      this.deleteInMongo(ids),
    ])
    return results[0];
  }

}