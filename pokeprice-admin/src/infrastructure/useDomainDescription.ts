import {Resource, useGetExternalResource} from "../common/useExternalResource";
import {configRetriever} from "./ConfigRetriever";

export interface QueryField {
  name:string,
  type:string,
}

export interface CompoundField {
  fieldNames:Array<string>,
}

export interface QueryMetadata {
  sortFields:Array<string>,
  queryFields:Array<QueryField>,
  allowedCompoundFields:Array<CompoundField>
}

export interface DomainDescription {
  domain:string,
  getOne:true,
  getMany:QueryMetadata
}

export const useDomainDescription = (domain:string):Resource<DomainDescription> => {
  const apiRoot = configRetriever.retrieve().apiRoot;
  return useGetExternalResource<DomainDescription>(
    `${apiRoot}/${domain}/action/describe`,
  )
}