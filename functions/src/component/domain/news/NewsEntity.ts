import {Entity} from "../../database/Entity";
import {Timestamp} from "../../external-lib/Firebase";

export interface NewsEntity extends Entity {
  date:Timestamp,
  title:string,
  description:string,
  imageUrl:string,
  backgroundImageUrl:string,
  category:string,
  newsLink:string,
  active:boolean,
}