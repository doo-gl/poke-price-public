import {Entity} from "../../database/Entity";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {Timestamp} from "../../external-lib/Firebase";

export enum DimensionName {
  SET = 'SET',
  SERIES = 'SERIES',
  ARTIST = 'ARTIST',
  RARITY = 'RARITY',
  TYPE = 'TYPE',
  SUB_TYPE = 'SUB_TYPE',
  SUPER_TYPE = 'SUPER_TYPE',
  POKEMON = 'POKEMON',
}
export enum Metric {
  MOST_VALUABLE = 'MOST_VALUABLE',
  SOLD_VOLUME = 'SOLD_VOLUME',
  LISTING_VOLUME = 'LISTING_VOLUME',
  SOLD_VOLATILITY = 'SOLD_VOLATILITY',
}
export interface Dimension {
  name:DimensionName,
  value:string,
}
export interface RankedCard {
  cardIds:Array<string>,
  position:string,
  value:any,
  displayValue:string,
}

export interface CardRankingEntity extends Entity {
  cardIds:Array<string>,
  key:string,
  isMostRecent:boolean,
  timestamp:Timestamp,
  dimensions:Array<Dimension>,
  metric:Metric,
  rankedCards:Array<RankedCard>,
}

const BY_DIMENSION_ASC = comparatorBuilder.combine(
  comparatorBuilder.objectAttributeASC<Dimension, string>(dimension => dimension.name),
  comparatorBuilder.objectAttributeASC<Dimension, string>(dimension => dimension.value),
);
export const createRankingKey = (metric:Metric, dimensions:Array<Dimension>) => {
  const dimensionKey = dimensions.sort(BY_DIMENSION_ASC).join(',');
  return `${dimensionKey}|${metric}`;
}