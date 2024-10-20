import {SetDto} from "./SetDto";
import {setRetriever} from "./SetRetriever";
import {setDtoMapper} from "./SetDtoMapper";


const retrieve = async (id:string):Promise<SetDto> => {
  const set = await setRetriever.retrieve(id);
  return setDtoMapper.map(set);
}

const retrieveAll = async ():Promise<Array<SetDto>> => {
  const sets = await setRetriever.retrieveAll();
  return sets.map(set => setDtoMapper.map(set));
}

export const setDtoRetriever = {
  retrieve,
  retrieveAll,
}