import {Entity} from "../../database/Entity";
import {EntityDto} from "../EntityDto";
import {BaseCrudRepository, FirestoreBaseCrudRepository} from "../../database/BaseCrudRepository";
import {byIdRetriever} from "../../database/ByIdRetriever";


const build = <ENT extends Entity, DTO extends EntityDto>(
  repository:FirestoreBaseCrudRepository<ENT>,
  entityMapper:((entity:ENT) => DTO),
  dataName:string,
):(id:string) => Promise<DTO> => {
  return async (id:string):Promise<DTO> => {
    const entity = await byIdRetriever.retrieve(repository, id, dataName);
    return entityMapper(entity);
  }
}

export const getOneFunctionBuilder = {
  build,
}