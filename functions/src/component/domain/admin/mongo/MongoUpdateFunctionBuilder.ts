import {EntityDto} from "../../EntityDto";
import {adminAuditLogRepository} from "../admin-audit-log/AdminAuditLogRepository";
import {Operation, Result} from "../admin-audit-log/AdminAuditLogEntity";
import {NotFoundError} from "../../../error/NotFoundError";
import {logger} from "firebase-functions";
import {UnexpectedError} from "../../../error/UnexpectedError";
import {userContext} from "../../../infrastructure/UserContext";
import {NotAuthorizedError} from "../../../error/NotAuthorizedError";
import {FieldTransforms} from "./MongoDomainEndpointBuilder";
import {lodash} from "../../../external-lib/Lodash";
import {JSONSchemaType} from "ajv";
import {jsonValidator} from "../../../tools/JsonValidator";
import {MongoEntity, Update} from "../../../database/mongo/MongoEntity";
import {MongoBaseCrudRepository} from "../../../database/mongo/MongoBaseCrudRepository";
import {ObjectId} from "mongodb";

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

const build = <ENT extends MongoEntity, DTO extends EntityDto>(
  repository:MongoBaseCrudRepository<ENT>,
  entityMapper:((entity:ENT) => DTO),
  entityUpdater:((id:string, update:Update<ENT>) => Promise<ENT>)|undefined,
  dataName:string,
):(id:string, update:Update<ENT>) => Promise<DTO> => {
  return async (id:string, update:Update<ENT>):Promise<DTO> => {

    const entity = await repository.getOneByMaybeLegacyId(id);
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
        updatedEntity = await entityUpdater(entity._id.toString(), update);
      } else {
        logger.info(`Updating ${dataName}, ${id}, fields: ${Object.keys(update).join(',')}`)
        updatedEntity = (await repository.updateAndReturn(entity._id, update))!;
        logger.info(`Updated ${dataName}, ${id}`);
      }
      await adminAuditLogRepository.create({
        entityType: repository.collectionName,
        entityId: entity._id.toString(),
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

const buildEntityUpdater = <ENT extends MongoEntity>(
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

export const mongoUpdateFunctionBuilder = {
  build,
  bodyToUpdateMapper,
  buildEntityUpdater,
}