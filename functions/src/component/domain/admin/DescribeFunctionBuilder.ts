import {CompoundFields, Field, QueryMetadata} from "./GetManyQueryMapper";
import {Entity} from "../../database/Entity";

export interface DomainDescription<ENT extends Entity> {
  domain:string,
  getOne:true,
  getMany:{
    allowedCompoundFields:Array<CompoundFields<ENT>>,
    sortFields:Array<keyof ENT|string>,
    queryFields:Array<Field<ENT>>,
  }
}

const build = <ENT extends Entity>(
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

export const describeFunctionBuilder = {
  build,
}