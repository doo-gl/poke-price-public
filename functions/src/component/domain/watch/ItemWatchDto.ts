import {ItemWatchState} from "./ItemWatchEntity";


export interface ItemWatchDto {
  itemWatchId:string,
  itemId:string,
  userId:string,
  state:ItemWatchState,
}