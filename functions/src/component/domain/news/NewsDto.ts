import {EntityDto} from "../EntityDto";
import {Moment} from "moment";


export interface NewsDto extends EntityDto {
  date:Moment,
  title:string,
  description:string,
  imageUrl:string,
  backgroundImageUrl:string,
  category:string,
  newsLink:string,
  active:boolean,
}