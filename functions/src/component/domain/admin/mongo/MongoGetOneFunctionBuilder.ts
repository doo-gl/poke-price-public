import {EntityDto} from "../../EntityDto";
import {MongoEntity} from "../../../database/mongo/MongoEntity";
import {MongoBaseCrudRepository} from "../../../database/mongo/MongoBaseCrudRepository";
import {NotFoundError} from "../../../error/NotFoundError";


const build = <ENT extends MongoEntity, DTO extends EntityDto>(
  repository:MongoBaseCrudRepository<ENT>,
  entityMapper:((entity:ENT) => DTO),
):(id:string) => Promise<DTO> => {
  return async (id:string):Promise<DTO> => {
    const entity = await repository.getOneByMaybeLegacyId(id)
    if (!entity) {
      throw new NotFoundError(`Failled to find ${repository.collectionName} with id: ${id}`)
    }
    return entityMapper(entity);
  }
}

export const mongoGetOneFunctionBuilder = {
  build,
}