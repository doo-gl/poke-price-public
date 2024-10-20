import {cardQueryMetadataRetriever} from "./CardQueryMetadataRetriever";

export interface KeyMetadataDto {
  label:string,
  values:Array<{value:string, label:string}>
}

export interface PublicCardQueryMetadataDto {
  metadata:{[key:string]:KeyMetadataDto}
}

const retrieve = async ():Promise<PublicCardQueryMetadataDto> => {
  const metadatas = await cardQueryMetadataRetriever.retrieveAll();
  const result:PublicCardQueryMetadataDto = { metadata: {} };
  metadatas.forEach(metadata =>
    result.metadata[metadata.key] = {
      label: metadata.keyLabel,
      values: metadata.values.map(value => ({ value: value.value, label: value.label })),
    }
  );
  return result;
}

export const publicCardQueryMetadataRetriever = {
  retrieve,
}