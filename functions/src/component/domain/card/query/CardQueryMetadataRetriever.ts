import {CardQueryMetadataEntity, cardQueryMetadataRepository} from "./CardQueryMetadataEntity";
import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";


const retrieveOptionalByKey = (key:string):Promise<CardQueryMetadataEntity|null> => {
  return singleResultRepoQuerier.query(
    cardQueryMetadataRepository,
    [
      { name: 'key', value: key },
    ],
    cardQueryMetadataRepository.collectionName
  )
}

const retrieveAll = ():Promise<Array<CardQueryMetadataEntity>> => {
  return cardQueryMetadataRepository.getMany([]);
}

export const cardQueryMetadataRetriever = {
  retrieveOptionalByKey,
  retrieveAll,
}