import {Entity} from "../../../database/Entity";


export interface AdminUserEntity extends Entity{
  authId:string,
  roles:Array<string>,
}