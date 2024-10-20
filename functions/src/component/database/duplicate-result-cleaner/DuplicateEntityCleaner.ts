import {DuplicateResultEntity} from "./DuplicateResultEntity";
import {Create, Entity} from "../Entity";
import {LoadingState} from "../../constants/LoadingState";
import {duplicateResultCreator, duplicateResultRepository, duplicateResultUpdater} from "./DuplicateResultRepository";
import {firestoreHolder} from "../FirestoreHolder";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {logger} from "firebase-functions";
import {handleAllErrors} from "../../tools/AllPromiseHandler";
import {batchIds} from "../BaseCrudRepository";
import {flattenArray} from "../../tools/ArrayFlattener";
import {batchArray} from "../../tools/ArrayBatcher";

const retrieveEntities = async (entityName:string, entityIds:Array<string>):Promise<Array<Entity>> => {
  const firestore = firestoreHolder.get();
  const collection = firestore.collection(entityName);
  const batchedIds = batchIds(entityIds);
  const results = await Promise.all(
    batchedIds.map(idBatch => collection.where('id', "in", idBatch).get())
  )
  const flattenedResults = flattenArray(
    results.map(result =>
      result.docs.map(doc => <any>doc.data())
    )
  )

  return flattenedResults
}

const deleteEntities = async (entityName:string, entityIds:Array<string>):Promise<void> => {
  const firestore = firestoreHolder.get();
  const collection = firestore.collection(entityName);
  const batch = firestore.batch();
  entityIds.forEach(entityId => {
    const docRef = collection.doc(entityId);
    batch.delete(docRef);
  });
  const results = await batch.commit();
}

const addEntityToClean = async (entityName:string, entityIds:Array<string>):Promise<DuplicateResultEntity> => {
  if (entityIds.length > 20) {
    const batchedIds = batchArray(entityIds, 20);
    const results = await Promise.all(
      batchedIds.map(idBatch => addEntityToClean(entityName, idBatch))
    )
    return results[0];
  }
  const idempotencyKey = `${entityName}|${entityIds.sort().join()}`;
  const preExistingResults = await duplicateResultRepository.getMany([
    { field: "idempotencyKey", operation: "==", value: idempotencyKey },
  ]);
  if (preExistingResults.length > 0) {
    return preExistingResults[0];
  }
  const create:Create<DuplicateResultEntity> = {
    state: LoadingState.NOT_STARTED,
    error: null,
    keptEntityId: null,
    deletedEntities: null,
    entityName,
    duplicateEntityIds: entityIds,
    idempotencyKey,
  }
  return duplicateResultCreator.create(create);
}

const BY_DATE_CREATED_ID_ASC = comparatorBuilder.combine<Entity>(
  comparatorBuilder.objectAttributeASC<Entity, number>(ent => ent.dateCreated.toMillis()),
  comparatorBuilder.objectAttributeASC<Entity, string>(ent => ent.id),
)

const cleanResult = async (result:DuplicateResultEntity):Promise<void> => {
  if (result.state !== LoadingState.NOT_STARTED) {
    return;
  }
  const entities = await retrieveEntities(result.entityName, result.duplicateEntityIds);
  if (entities.length < 2) {
    await duplicateResultUpdater.updateOnly(result.id, {state: LoadingState.SUCCESSFUL});
    return;
  }
  const entityIdToKeep = entities.sort(BY_DATE_CREATED_ID_ASC)[0].id;
  const entitiesToDelete = entities.filter(ent => ent.id !== entityIdToKeep);
  await duplicateResultUpdater.updateOnly(
    result.id,
    {
      deletedEntities: entitiesToDelete,
      keptEntityId: entityIdToKeep,
      state: LoadingState.IN_PROGRESS,
    }
  );
  try {
    await deleteEntities(result.entityName, entitiesToDelete.map(ent => ent.id));
    await duplicateResultRepository.delete(result.id)
  } catch (err:any) {
    logger.error(`Failed to clean up duplicate entities`, err)
    await duplicateResultUpdater.updateOnly(
      result.id,
      {state: LoadingState.FAILED, error: err}
    );
  }
}

const clean = async (numberToClean:number) => {
  const results = await duplicateResultRepository.getMany(
    [{field: "state", operation: "==", value: LoadingState.NOT_STARTED}],
    { limit: numberToClean }
  );
  if (results.length === 0) {
    return;
  }
  await handleAllErrors(
    results.map(result => cleanResult(result)),
    'Failed to clean results'
  )
}

export const duplicateEntityCleaner = {
  addEntityToClean,
  clean,
}

