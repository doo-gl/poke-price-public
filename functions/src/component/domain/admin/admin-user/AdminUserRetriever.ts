import {AdminUserEntity} from "./AdminUserEntity";
import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";
import {adminUserRepository} from "./AdminUserRepository";


const retrieveByAuthId = (authId:string):Promise<AdminUserEntity|null> => {
  return singleResultRepoQuerier.query(
    adminUserRepository,
    [
      { name: "authId", value: authId },
    ],
    'admin-user'
  )
}

export const adminUserRetriever = {
  retrieveByAuthId,
}