import {EntityDto} from "../EntityDto";
import {ExternalIdentifiers, SearchKeywords} from "../card/CardEntity";
import {Moment} from "moment";
import {UniqueSet} from "./UniqueSet";
import {PokePrice} from "./SetEntity";


export interface SetDto extends EntityDto, UniqueSet {
  imageUrl:string,
  backgroundImageUrl:string|null
  symbolUrl:string|null,
  displaySetNumber:string,
  releaseDate:Moment,
  totalCards:number,
  externalIdentifiers:ExternalIdentifiers,
  pokePrice:PokePrice|null,
  visible:boolean,
  searchKeywords: SearchKeywords,
}