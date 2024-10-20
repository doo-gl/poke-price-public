import {archivedDataCreator, archivedDataDeleter, ArchivedDataEntity, archivedDataUpdater} from "./ArchiveEntity";
import {Entity} from "../../database/Entity";
import {appHolder} from "../../infrastructure/AppHolder";
import {isProduction} from "../../infrastructure/ProductionDecider";
import moment from "moment";
import {CollectionReference, DocumentData, TimestampStatic} from "../../external-lib/Firebase";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {firestoreHolder} from "../../database/FirestoreHolder";
import {batchArray} from "../../tools/ArrayBatcher";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {BaseCrudRepository} from "../../database/BaseCrudRepository";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {File} from "@google-cloud/storage";
import JSZip from 'jszip'
import {logger} from "firebase-functions";

interface ArchivedData {
  collectionName:string,
  archivedAt:string,
  data:Array<any>,
  metadata:any,
  archiveEntityId:string,
}

const bundleEntities = <T extends Entity>(entities:Array<T>, archiveEntity:ArchivedDataEntity):ArchivedData => {
  return {
    collectionName: archiveEntity.collectionName,
    archiveEntityId: archiveEntity.id,
    archivedAt: new Date().toISOString(),
    metadata: archiveEntity.metadata,
    data: entities,
  }
}

const doZip = (fileName:string, data:ArchivedData):Promise<Buffer> => {
  const stringifiedData = JSON.stringify(data)
  const zip = new JSZip()
  zip.file(`${fileName}.json`, stringifiedData)
  return zip.generateAsync({type:"nodebuffer", compression: "DEFLATE", compressionOptions: {level: 9}})
}

const doUnZip = async (data:Buffer):Promise<ArchivedData> => {
  const zip = await JSZip.loadAsync(data)
  const files = Object.keys(zip.files)
  if (files.length === 0) {
    throw new Error("Failed to find any files in zip")
  }
  const fileName = files[0]
  const content = await zip.file(fileName)?.async("string")
  if (!content) {
    throw new Error(`No file in zip for file name: ${fileName}`)
  }
  try {
    return JSON.parse(content) as ArchivedData
  } catch (err) {
    throw new Error(`Failed to parse content fo file: ${fileName}`)
  }
}

const archive = async <T extends Entity>(collectionName:string, entities:Array<T>, metadata:any):Promise<ArchivedDataEntity|null> => {
  if (entities.length === 0) {
    return null
  }
  const archivedDataEntity = await archivedDataCreator.create({
    collectionName,
    numberOfEntities: entities.length,
    metadata,
    filePath: null,
    entitiesArchivedAt: null,
  })

  const app = appHolder.getAdminApp()
  const bucket = app.storage().bucket('INSERT_BUCKET_NAME_HERE')
  const folder = isProduction() ? 'archive' : 'test/archive';
  const date = moment().format("YYYY_MM_DD")
  const time = moment().format("hh_mm")
  const fileName = `${date}_${time}__${archivedDataEntity.id}`
  const filePath = `${folder}/${date}/${collectionName}/${fileName}.zip`
  const file = bucket.file(filePath)

  const archiveData = bundleEntities(entities, archivedDataEntity)
  const zippedData = await doZip(fileName, archiveData)

  await file.save(
    zippedData,
    {}
  )
  await file.setStorageClass("ARCHIVE")
  
  return await archivedDataUpdater.updateAndReturn(
    archivedDataEntity.id,
    {
      entitiesArchivedAt: TimestampStatic.now(),
      filePath,
    }
  )
}

const convertToFirebaseObject = (json:any, fieldKey?:string):any => {
  if (json === null) {
    return null;
  }
  if (json === undefined) {
    return undefined;
  }

  if (json._seconds !== undefined && json._nanoseconds !== undefined) {
    const millis = (json._seconds * 1000) + (json._nanoseconds / 1000000);
    return TimestampStatic.fromMillis(millis);
  }

  if (Array.isArray(json)) {
    return json.map(val => convertToFirebaseObject(val));
  }

  if (typeof json === 'object') {
    const result:any = {};
    Object.entries(json).forEach((entry) => {
      const key = entry[0];
      const value:any = entry[1];
      result[key] = convertToFirebaseObject(value, key);
    })
    return result;
  }

  return json;
}

const filterPreExistingEntities = async (repo:BaseCrudRepository<any>, rawEntities:Array<any>):Promise<Array<any>> => {
  const preExistingEntityIdSet = new Set<string>()
  const entityIds = rawEntities.map(rawEntity => rawEntity.id)
  const results = await repo.getManyById(entityIds)
  results.forEach(result => preExistingEntityIdSet.add(result.id))
  return rawEntities.filter(rawEntity => !preExistingEntityIdSet.has(rawEntity.id))
}

const insertRawEntities = async (collection:CollectionReference<DocumentData>, rawEntities:Array<any>) => {
  const firestoreDB = collection.firestore
  const batchedRawEntities = batchArray(rawEntities, 200)
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 1})
  await Promise.all(batchedRawEntities.map(rawEntityBatch => queue.addPromise(async () => {
    const firebaseObjects = rawEntityBatch.map(rawEntity => convertToFirebaseObject(rawEntity))
    const batch = firestoreDB.batch()
    firebaseObjects.forEach(firebaseObject => {
      const ref = collection.doc(firebaseObject.id)
      batch.create(ref, firebaseObject)
    })
    await batch.commit()
  })))
}

const deArchiveFromFile = async (file:File):Promise<void> => {
  const fileContent = await file.download()
  const archivedData:ArchivedData = await doUnZip(fileContent[0])

  const collectionName = archivedData.collectionName
  const rawEntities = archivedData.data
  const firestoreDB = firestoreHolder.get();
  const collection = firestoreDB.collection(collectionName)
  const repo = new BaseCrudRepository<any>(firestoreDB, collectionName, () => null, databaseStatsLogger.log)

  const newRawEntities = await filterPreExistingEntities(repo, rawEntities)
  await insertRawEntities(collection, newRawEntities)

  await file.delete({ignoreNotFound: true})
}

const deArchive = async (archivedDataEntity:ArchivedDataEntity) => {

  const filePath = archivedDataEntity.filePath

  if (!filePath) {
    throw new InvalidArgumentError(`Archived Data: ${archivedDataEntity.id}, does not have a file path`)
  }
  const app = appHolder.getAdminApp()
  const bucket = app.storage().bucket('INSERT_GOOGLE_PROJECT_HERE.appspot.com')
  const file = bucket.file(filePath)
  await deArchiveFromFile(file)
  await archivedDataDeleter.delete(archivedDataEntity.id)

}


export const entityArchiver = {
  archive,
  deArchive,
  deArchiveFromFile,
}