import {EntityDto} from "../../domain/EntityDto";
import {Moment} from "moment";

export interface CacheEntryDto extends EntityDto {
  key:string,
  value:any,
  dateEntryExpires:Moment,
  entryType:string,
}