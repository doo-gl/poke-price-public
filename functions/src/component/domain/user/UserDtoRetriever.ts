import {userRetriever} from "./UserRetriever";
import {userDtoMapper} from "./UserDtoMapper";


const retrieveAnonymous = async (id:string) => {
  const user = await userRetriever.retrieve(id);
  return userDtoMapper.mapAnonymous(user);
}

export const userDtoRetriever = {
  retrieveAnonymous,
}