import {Create, Entity, Update} from "../../database/Entity";
import {EntityDto} from "../EntityDto";
import {BaseCrudRepository, FirestoreBaseCrudRepository} from "../../database/BaseCrudRepository";
import {adminAuditLogRepository} from "./admin-audit-log/AdminAuditLogRepository";
import {Operation, Result} from "./admin-audit-log/AdminAuditLogEntity";
import {NotFoundError} from "../../error/NotFoundError";
import {logger} from "firebase-functions";
import {UnexpectedError} from "../../error/UnexpectedError";
import {userContext} from "../../infrastructure/UserContext";
import {NotAuthorizedError} from "../../error/NotAuthorizedError";
import {FieldTransforms} from "./DomainEndpointBuilder";
import {lodash} from "../../external-lib/Lodash";
import {JSONSchemaType} from "ajv";
import {jsonValidator} from "../../tools/JsonValidator";

const bodyToUpdateMapper = (
  fieldTransforms:FieldTransforms
):(body:any) => any => {
  return body => {
    const result = lodash.cloneDeep(body);
    Object.entries(fieldTransforms).forEach(entry => {
      const fieldName = entry[0];
      const transform = entry[1];
      const value = result[fieldName];
      if (value) {
        result[fieldName] = transform(value);
      }
    })
    return result;
  }
}

const build = <ENT extends Entity, DTO extends EntityDto>(
  repository:FirestoreBaseCrudRepository<ENT>,
  entityMapper:((entity:ENT) => DTO),
  entityUpdater:((id:string, update:Update<ENT>) => Promise<ENT>)|undefined,
  dataName:string,
):(id:string, update:Update<ENT>) => Promise<DTO> => {
  return async (id:string, update:Update<ENT>):Promise<DTO> => {

    const entity = await repository.getOne(id);
    const adminUser = userContext.getAdminUser();

    if (!adminUser) {
      throw new NotAuthorizedError(`Not an Admin`);
    }

    if (!entity) {
      const message = `Entity ${dataName} with id: ${id}, does not exist`
      await adminAuditLogRepository.create({
        entityType: repository.collectionName,
        entityId: id,
        operation: Operation.UPDATE,
        result: Result.FAILED,
        detail: { message },
        previousValue: null,
        changeValue: update,
        newValue: null,
        userId: adminUser.id,
      })
      throw new NotFoundError(message);
    }

    try {

      let updatedEntity:ENT;
      if (entityUpdater) {
        updatedEntity = await entityUpdater(id, update);
      } else {
        logger.info(`Updating ${dataName}, ${id}, fields: ${Object.keys(update).join(',')}`)
        updatedEntity = (await repository.updateOne(id, update))!;
        logger.info(`Updated ${dataName}, ${id}`);
      }
      await adminAuditLogRepository.create({
        entityType: repository.collectionName,
        entityId: id,
        operation: Operation.UPDATE,
        result: Result.SUCCESSFUL,
        detail: null,
        previousValue: entity,
        changeValue: update,
        newValue: updatedEntity,
        userId: adminUser.id,
      })
      return entityMapper(updatedEntity);

    } catch (err:any) {

      logger.error(`Failed to update ${dataName}, ${id}`, err);
      await adminAuditLogRepository.create({
        entityType: repository.collectionName,
        entityId: id,
        operation: Operation.UPDATE,
        result: Result.FAILED,
        detail: { message: err.message, error: err },
        previousValue: entity,
        changeValue: update,
        newValue: null,
        userId: adminUser.id,
      })
      throw new UnexpectedError(err.message)

    }
  }
}

const buildEntityUpdater = <ENT extends Entity>(
  entityUpdater:((id:string, update:Update<ENT>) => Promise<ENT>),
  schema:JSONSchemaType<Update<ENT>>
):((id:string, update:any) => Promise<ENT>) => {
  return (id:string, request:any) => {
    const requestCopy = {...request};
    delete requestCopy.id;
    delete requestCopy.dateCreated;
    delete requestCopy.dateLastModified;
    const validatedRequest = jsonValidator.validate(requestCopy, schema)
    return entityUpdater(id, validatedRequest)
  }
}

export const updateFunctionBuilder = {
  build,
  bodyToUpdateMapper,
  buildEntityUpdater,
}