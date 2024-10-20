import {EntityDto} from "../EntityDto";
import {GetManyRequest} from "./GetManyRequest";
import {Entity, Update} from "../../database/Entity";
import {BaseCrudRepository, FirestoreBaseCrudRepository} from "../../database/BaseCrudRepository";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {getOneFunctionBuilder} from "./GetOneFunctionBuilder";
import {getListFunctionBuilder} from "./GetListFunctionBuilder";
import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ADMIN_AUTH} from "../../infrastructure/Authorization";
import {buildQueryMapper, DEFAULT_QUERY_METADATA, QueryMetadata} from "./GetManyQueryMapper";
import {describeFunctionBuilder} from "./DescribeFunctionBuilder";
import {updateFunctionBuilder} from "./UpdateFunctionBuilder";
import {createFunctionBuilder} from "./CreateFunctionBuilder";

export type FieldTransforms = {
  [key:string]: (value:any) => any
}

export class DomainEndpointBuilder<ENT extends Entity, DTO extends EntityDto> {

  private _entityMapper:((entity:ENT) => DTO)|undefined;
  private _entityUpdater:((id:string, update:Update<ENT>) => Promise<ENT>)|undefined;
  private _entityCreator:((request:any) => Promise<ENT>)|undefined;
  private _repository:FirestoreBaseCrudRepository<ENT>|undefined;
  private _dataName:string|undefined;
  private _queryMetadata:QueryMetadata<ENT> = DEFAULT_QUERY_METADATA;
  private _isUpdatable = false;
  private _fieldTransforms:FieldTransforms = {};
  private _extraEndpoints:Array<Endpoint> = [];

  entityMapper(mapper:(entity:ENT) => DTO) {
    this._entityMapper = mapper;
    return this;
  }

  entityUpdater(updater:(id:string, update:Update<ENT>) => Promise<ENT>) {
    this._entityUpdater = updater;
    return this;
  }

  entityCreator(creator:(request:any) => Promise<ENT>) {
    this._entityCreator = creator;
    return this;
  }

  repository(repo:FirestoreBaseCrudRepository<ENT>) {
    this._repository = repo;
    return this;
  }

  dataName(name:string) {
    this._dataName = name;
    return this;
  }

  queryMetadata(metadata:QueryMetadata<ENT>) {
    this._queryMetadata = metadata;
    return this;
  }

  fieldTransforms(fieldTransforms:FieldTransforms) {
    this._fieldTransforms = fieldTransforms;
    return this;
  }

  extraEndpoints(extraEndpoints:Array<Endpoint>) {
    this._extraEndpoints = extraEndpoints;
    return this;
  }

  isUpdatable() {
    this._isUpdatable = true;
    return this;
  }

  build():Array<Endpoint> {
    if (!this._repository) {
      throw new InvalidArgumentError(`Cannot build provider without a repo`);
    }
    if (!this._entityMapper) {
      throw new InvalidArgumentError(`Cannot build provider without an entity mapper`);
    }
    if (!this._dataName) {
      throw new InvalidArgumentError(`Cannot build provider without a data name`);
    }
    if (!this._queryMetadata) {
      throw new InvalidArgumentError(`Cannot build provider without a query metadata`);
    }

    const endpoints:Array<Endpoint> = [];

    const describe = describeFunctionBuilder.build<ENT>(this._dataName, this._queryMetadata);
    endpoints.push({
      path: `/${this._dataName}/action/describe`,
      method: Method.GET,
      auth: ADMIN_AUTH,
      requestHandler: async (req, res, next) => {
        return describe();
      },
    })

    const getOne = getOneFunctionBuilder.build<ENT, DTO>(this._repository, this._entityMapper, this._dataName);
    endpoints.push({
      path: `/${this._dataName}/:id`,
      method: Method.GET,
      auth: ADMIN_AUTH,
      requestHandler: async (req, res, next) => {
        const id = req.params['id']
        return getOne(id);
      },
    })

    const getMany = getListFunctionBuilder.build<ENT, DTO>(this._repository, this._entityMapper);
    const queryMapper = buildQueryMapper(this._queryMetadata, this._fieldTransforms);
    endpoints.push({
      path: `/${this._dataName}`,
      method: Method.GET,
      auth: ADMIN_AUTH,
      requestHandler: async (req, res, next) => {
        const query = req.query;
        const request:GetManyRequest<ENT> = queryMapper(query);
        return getMany(request);
      },
    })

    if (this._isUpdatable || this._entityUpdater !== undefined) {
      const update = updateFunctionBuilder.build<ENT, DTO>(this._repository, this._entityMapper, this._entityUpdater, this._dataName);
      const mapper = updateFunctionBuilder.bodyToUpdateMapper(this._fieldTransforms);
      endpoints.push({
        path: `/${this._dataName}/:id`,
        method: Method.PUT,
        auth: ADMIN_AUTH,
        requestHandler: async (req, res, next) => {
          const id = req.params['id'];
          const mappedBody = mapper(req.body);
          return update(id, mappedBody);
        },
      })
    }

    if (this._entityCreator) {
      const create = createFunctionBuilder.build<ENT, DTO>(this._repository, this._entityMapper, this._entityCreator, this._dataName);
      endpoints.push({
        path: `/${this._dataName}`,
        method: Method.POST,
        auth: ADMIN_AUTH,
        requestHandler: async (req, res, next) => {
          const request = req.body
          return create(request);
        },
      })
    }

    this._extraEndpoints.forEach(endpoint => endpoints.push(endpoint));

    return endpoints;
  }
}

