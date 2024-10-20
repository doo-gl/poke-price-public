import {cardRepository} from "../CardRepository";
import {cardQueryMetadataCreator, cardQueryMetadataUpdater, CardQueryMetadataValue} from "./CardQueryMetadataEntity";
import {cardQueryMetadataRetriever} from "./CardQueryMetadataRetriever";
import {capitaliseKey, convertToKey} from "../../../tools/KeyConverter";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {
  ListingPriceValueTag,
  ListingVolumeValueTag,
  SoldPriceValueTag,
  SoldVolumeValueTag, SupplyVsDemandValueTag,
  TotalCirculationValueTag, VolatilityValueTag,
} from "./ValueTagExtractor";
import capitalize from "capitalize";
import {CardVariant} from "../CardEntity";

const KEY_LABELS:any = {
  series: 'Series',
  set: 'Set',
  name: 'Name',
  number: 'Number',
  setNumber: 'Set Number',
  rarity: 'Rarity',
  artist: 'Artist',
  superType: 'Super Type',
  pokemon: 'Pokémon',
  subType: 'Sub Type',
  energyType: 'Energy Type',
  variant: 'Variant',
  soldPrice: 'Sold Price',
  listingPrice: 'Listing Price',
  soldVolume: 'Sold Volume',
  listingVolume: 'Listing Volume',
  totalCirculation: 'Total Circulation',
  supplyVsDemand: 'Supply vs. Demand',
  volatility: 'Volatility',
}

const upsertKey = async (key:string, values:Array<CardQueryMetadataValue>):Promise<void> => {
  const preExistingMetadata = await cardQueryMetadataRetriever.retrieveOptionalByKey(key);
  const label = KEY_LABELS[key] ?? key;

  if (preExistingMetadata) {
    await cardQueryMetadataUpdater.updateOnly(preExistingMetadata.id, { values, keyLabel: label })
  } else {
    await cardQueryMetadataCreator.create({
      key,
      keyLabel: label,
      values,
    })
  }
}

const populate = async ():Promise<void> => {

  const metadataMap = new Map<string, Set<string>>();

  const addToMap = (key:string, value:string|null, label:string|null) => {
    if (!value || !label) {
      return;
    }
    let set = metadataMap.get(key);
    if (!set) {
      set = new Set<string>()
    }
    const valueWithLabel = `${value}|${label}`
    set.add(valueWithLabel)
    metadataMap.set(key, set);
  }

  await cardRepository.iterator().iterate(async card => {

    const series:string = card.series;
    const set:string = card.set;
    const name:string = card.displayName;
    const pokemon:Array<string> = card.pokemon;
    const number:string = card.numberInSet;
    const setNumber:string = card.displaySetNumber;
    const rarity:string|null = card.rarity;
    const artist:string|null = card.artist;
    const subTypes:Array<string> = card.subTypes;
    const superType:string = card.superType;
    const energyTypes:Array<string> = card.types;

    addToMap('series', series, capitaliseKey(series));
    addToMap('set', set, capitaliseKey(set));
    addToMap('name', convertToKey(name), name);
    addToMap('number', number.toLowerCase(), number.toUpperCase());
    addToMap('setNumber', setNumber.toLowerCase(), setNumber.toUpperCase());
    addToMap('rarity', rarity, rarity ? capitaliseKey(rarity) : null);
    addToMap('artist', artist ? convertToKey(artist) : null, artist);
    addToMap('superType', superType, capitaliseKey(superType));
    pokemon.forEach(value => addToMap('pokemon', value, capitaliseKey(value)))
    subTypes.forEach(value => addToMap('subType', value, capitaliseKey(value)))
    energyTypes.forEach(value => addToMap('energyType', value, capitaliseKey(value)))

    return false;
  })

  addToMap('variant', CardVariant.DEFAULT, 'Standard')
  addToMap('variant', CardVariant.REVERSE_HOLO, 'Reverse Holo')

  Object.values(SoldPriceValueTag).forEach(tag => {
    const label = capitalize.words(tag.toLowerCase().replace(/_/gim, ' '))
    addToMap('soldPrice', tag, label)
  })
  Object.values(ListingPriceValueTag).forEach(tag => {
    const label = capitalize.words(tag.toLowerCase().replace(/_/gim, ' '))
    addToMap('listingPrice', tag, label)
  })
  Object.values(SoldVolumeValueTag).forEach(tag => {
    const label = capitalize.words(tag.toLowerCase().replace(/_/gim, ' '))
    addToMap('soldVolume', tag, label)
  })
  Object.values(ListingVolumeValueTag).forEach(tag => {
    const label = capitalize.words(tag.toLowerCase().replace(/_/gim, ' '))
    addToMap('listingVolume', tag, label)
  })
  Object.values(TotalCirculationValueTag).forEach(tag => {
    const label = capitalize.words(tag.toLowerCase().replace(/_/gim, ' '))
    addToMap('totalCirculation', tag, label)
  })
  Object.values(SupplyVsDemandValueTag).forEach(tag => {
    const label = capitalize.words(tag.toLowerCase().replace(/_/gim, ' '))
    addToMap('supplyVsDemand', tag, label)
  })
  Object.values(VolatilityValueTag).forEach(tag => {
    const label = capitalize.words(tag.toLowerCase().replace(/_/gim, ' '))
    addToMap('volatility', tag, label)
  })

  await Promise.all(
    [...metadataMap.entries()].map(entry => {
      const key = entry[0];
      const valueWithLabels = entry[1]
      const values = [...valueWithLabels.values()].map(valueWithLabel => {
        const split = valueWithLabel.split('|');
        const value = split[0];
        const label = split[1];
        return { value, label }
      })
      values.sort(comparatorBuilder.objectAttributeASC(value => value.value))
      return upsertKey(key, values)
    })
  )

}

export const cardQueryMetadataPopulator = {
  populate,
}