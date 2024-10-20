import {CardEntity, PokePriceV2} from "../../card/CardEntity";
import {Moment} from "moment";
import moment from "moment/moment";


const calculate = (pokePrice:PokePriceV2):Moment => {
  // update the poke price on a card between 8 hours and 3 days
  const minPeriodBetweenCalculationsInHours = 8;
  const maxPeriodBetweenCalculationsInHours = 24 * 3;
  const minVolume = 0;
  const maxVolume = 30;
  const volume = (pokePrice.soldVolume ?? 0) + (pokePrice.listingVolume ?? 0);
  const gradient =
    (maxPeriodBetweenCalculationsInHours - minPeriodBetweenCalculationsInHours)
    / (maxVolume - minVolume)

  const hours = maxPeriodBetweenCalculationsInHours - (volume * gradient)
  // if the hours land up being less than min because a card sells very well, limit it to the min period
  const periodHours = Math.max(minPeriodBetweenCalculationsInHours, hours)
  return moment().add(periodHours, 'hours')
}

export const nextPokePriceCalculationTimeCalculator = {
  calculate,
}