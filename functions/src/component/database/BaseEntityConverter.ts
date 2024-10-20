import {DocumentData} from "../external-lib/Firebase";


const convert = <T>(data:DocumentData|undefined):T|null => {
  if (!data) {
    return null;
  }
  const dataCopy = {...data};
  // dataCopy.dateCreated = timestampToMoment(dataCopy.dateCreated);
  // dataCopy.dateLastModified = timestampToMoment(dataCopy.dateLastModified);
  return <T>{...dataCopy};
}

export const baseEntityConverter = {
  convert,
}