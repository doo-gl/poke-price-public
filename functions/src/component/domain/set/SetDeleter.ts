import {UniqueSet} from "./UniqueSet";
import {setRetriever} from "./SetRetriever";
import {setRepository} from "./SetRepository";


const deleteSet = async (set:UniqueSet):Promise<void> => {
  const setEntity = await setRetriever.retrieveSet(set);
  const result = await setRepository.delete(setEntity.id);
  return;
}

export const setDeleter = {
  deleteSet,
}