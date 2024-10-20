import {CompoundFields, Field, QueryMetadata} from "./MongoGetManyQueryMapper";
import {MongoEntity} from "../../../database/mongo/MongoEntity";

export interface DomainDescription<ENT extends MongoEntity> {
  domain:string,
  getOne:true,
  getMany:{
    allowedCompoundFields:Array<CompoundFields<ENT>>,
    sortFields:Array<keyof ENT|string>,
    queryFields:Array<Field<ENT>>,
  }
}

const build = <ENT extends MongoEntity>(
  dataName:string,
  queryMetadata:QueryMetadata<ENT>
):() => Promise<DomainDescription<ENT>> => {
  return () => {
    return Promise.resolve({
      domain: dataName,
      getOne: true,
      getMany: {
        queryFields: queryMetadata.queryFields,
        sortFields: queryMetadata.sortFields,
        allowedCompoundFields: queryMetadata.allowedCompoundFields,
      },
    });
  }
}

export const mongoDescribeFunctionBuilder = {
  build,
}