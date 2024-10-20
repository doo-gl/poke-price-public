import {Create, Entity} from "../../database/Entity";
import {EntityDto} from "../EntityDto";
import {FirestoreBaseCrudRepository} from "../../database/BaseCrudRepository";
import {userContext} from "../../infrastructure/UserContext";
import {NotAuthorizedError} from "../../error/NotAuthorizedError";
import {adminAuditLogRepository} from "./admin-audit-log/AdminAuditLogRepository";
import {Operation, Result} from "./admin-audit-log/AdminAuditLogEntity";
import {logger} from "firebase-functions";
import {UnexpectedError} from "../../error/UnexpectedError";
import {JSONSchemaType} from "ajv";
import {jsonValidator} from "../../tools/JsonValidator";


const build = <ENT extends Entity, DTO extends EntityDto>(
  repository:FirestoreBaseCrudRepository<ENT>,
  entityMapper:((entity:ENT) => DTO),
  entityCreator:((request:any)=> Promise<ENT>),
  dataName:string,
):(request:any) => Promise<DTO> => {
  return async (request:any):Promise<DTO> => {

    const adminUser = userContext.getAdminUser();

    if (!adminUser) {
      throw new NotAuthorizedError(`Not an Admin`);
    }

    try {

      const createdEntity:ENT = await entityCreator(request);
      await adminAuditLogRepository.create({
        entityType: repository.collectionName,
        entityId: createdEntity.id,
        operation: Operation.CREATE,
        result: Result.SUCCESSFUL,
        detail: null,
        previousValue: null,
        changeValue: null,
        newValue: createdEntity,
        userId: adminUser.id,
      })
      return entityMapper(createdEntity);

    } catch (err:any) {

      logger.error(`Failed to create ${dataName}`, err);
      await adminAuditLogRepository.create({
        entityType: repository.collectionName,
        entityId: null,
        operation: Operation.CREATE,
        result: Result.FAILED,
        detail: { message: err.message, error: {...err} },
        previousValue: null,
        changeValue: request,
        newValue: null,
        userId: adminUser.id,
      })
      throw new UnexpectedError(err.message)

    }
  }
}

const buildEntityCreator = <ENT extends Entity>(
  entityCreator:((request:any)=> Promise<ENT>),
  schema:JSONSchemaType<Create<ENT>>
):((request:any)=> Promise<ENT>) => {
  return request => {
    const requestCopy = {...request};
    delete requestCopy.id;
    delete requestCopy.dateCreated;
    delete requestCopy.dateLastModified;
    const validatedRequest = jsonValidator.validate(requestCopy, schema)
    return entityCreator(validatedRequest)
  }
}

export const createFunctionBuilder = {
  build,
  buildEntityCreator,
}