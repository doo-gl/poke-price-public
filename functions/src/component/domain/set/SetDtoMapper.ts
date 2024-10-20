import {SetEntity} from "./SetEntity";
import {SetDto} from "./SetDto";
import {ExternalIdentifiers} from "../card/CardEntity";
import {lodash} from "../../external-lib/Lodash";
import {timestampToMoment} from "../../tools/TimeConverter";
import {PublicSetDto} from "./PublicSetDto";
import {NotFoundError} from "../../error/NotFoundError";
import {entityDtoMapper} from "../EntityDtoMapper";
import {CurrencyCode} from "../money/CurrencyCodes";

const mapExternalIdentifiers = (externalIdentifiers:ExternalIdentifiers):ExternalIdentifiers => {
  const result:ExternalIdentifiers = lodash.cloneDeep(externalIdentifiers);
  // in this instance, no mapping required, but at some point we are going to want to avoid exposing all the info
  return result;
}

const map = (setEntity:SetEntity):SetDto => {
  return {
    ...entityDtoMapper.map(setEntity),
    series: setEntity.series,
    set: setEntity.name,
    totalCards: setEntity.totalCards,
    displaySetNumber: setEntity.displaySetNumber,
    releaseDate: timestampToMoment(setEntity.releaseDate),
    externalIdentifiers: mapExternalIdentifiers(setEntity.externalIdentifiers),
    imageUrl: setEntity.imageUrl,
    backgroundImageUrl: setEntity.backgroundImageUrl,
    symbolUrl: setEntity.symbolUrl,
    pokePrice: setEntity.pokePrice,
    visible: setEntity.visible,
    searchKeywords: setEntity.searchKeywords,
  }
}

const mapPublic = (set:SetEntity):PublicSetDto => {
  // if (!set.pokePrice) {
  //   throw new InvalidArgumentError(`Set with id: ${set.id} does not have a PokePrice`);
  // }
  // if (!set.visible) {
  //   throw new NotFoundError(`Set with id: ${set.id} does not exist`);
  // }
  return {
    setId: set.id,
    series: set.series,
    set: set.name,
    countInSet: set.totalCards,
    displaySetNumber: set.displaySetNumber,
    imageUrl: set.imageUrl,
    symbolImageUrl: set.symbolUrl,
    backgroundImageUrl: set.backgroundImageUrl,
    pokePrice: set.pokePrice?.price ?? { amountInMinorUnits: 0, currencyCode: CurrencyCode.GBP },
  }
}

export const setDtoMapper = {
  map,
  mapPublic,
}