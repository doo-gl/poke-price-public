import {queryString} from "../external-lib/QueryString";
import {NotFoundError} from "../error/NotFoundError";
import {baseExternalClient} from "./BaseExternalClient";

/*
 ** UNMAPPED URL SLUGS **

battle-academy
mcdonalds-promos-2018
miscellaneous-cards-and-products
world-championship-decks
sm-trainer-kit-alolan-sandslash-and-alolan-ninetales
mcdonalds-promos-2017
alternate-art-promos
sm-trainer-kit-lycanroc-and-alolan-raichu
deck-exclusives
league-and-championship-cards
xy-trainer-kit-pikachu-libre-and-suicune
generations-radiant-collection
mcdonalds-promos-2015
xy-trainer-kit-latias-and-latios
jumbo-cards
xy-trainer-kit-bisharp-and-wigglytuff
mcdonalds-promos-2014
xy-trainer-kit-sylveon-and-noivern
legendary-treasures-radiant-collection
bw-trainer-kit-excadrill-and-zoroark
professor-program-promos
pikachu-world-collection-promos
hgss-promos
burger-king-promos
countdown-calendar-promos
dp-trainer-kit-manaphy-and-lucario
ex-battle-stadium
kids-wb-promos
best-of-promos
wotc-promo
blister-exclusives
base-set-shadowless
dp-training-kit-1-blue
dp-training-kit-1-gold
ex-trainer-kit-1-latias-and-latios
ex-trainer-kit-2-plusle-and-minun
hgss-trainer-kit-gyarados-and-raichu
mcdonalds-promos-2012_new
 */

const seriesSetToUrlSlug:Map<string, string> = new Map<string, string>([
  [queryString.stringify({series: 'scarlet-and-violet', set: 'paldea-evolved'}), 'sv02-paldea-evolved'],
  [queryString.stringify({series: 'scarlet-and-violet', set: 'scarlet-and-violet'}), 'sv01-scarlet-and-violet-base-set'],
  [queryString.stringify({series: 'scarlet-and-violet', set: 'scarlet-and-violet-promos'}), 'sv-scarlet-and-violet-promo-cards'],
  [queryString.stringify({series: 'sword-and-shield', set: 'crown-zenith-galarian-gallery'}), 'crown-zenith-galarian-gallery'],
  [queryString.stringify({series: 'sword-and-shield', set: 'crown-zenith'}), 'crown-zenith'],
  [queryString.stringify({series: 'sword-and-shield', set: 'silver-tempest-trainer-gallery'}), 'swsh12-silver-tempest-trainer-gallery'],
  [queryString.stringify({series: 'sword-and-shield', set: 'silver-tempest'}), 'swsh12-silver-tempest'],
  [queryString.stringify({series: 'sword-and-shield', set: 'lost-origin-trainer-gallery'}), 'swsh11-lost-origin-trainer-gallery'],
  [queryString.stringify({series: 'sword-and-shield', set: 'lost-origin'}), 'swsh11-lost-origin'],
  [queryString.stringify({series: 'sword-and-shield', set: 'pokémon-go'}), 'pokemon-go'],
  [queryString.stringify({series: 'sword-and-shield', set: 'astral-radiance-trainer-gallery'}), 'swsh10-astral-radiance-trainer-gallery'],
  [queryString.stringify({series: 'sword-and-shield', set: 'astral-radiance'}), 'swsh10-astral-radiance'],
  [queryString.stringify({series: 'sword-and-shield', set: 'brilliant-stars-trainer-gallery'}), 'swsh09-brilliant-stars-trainer-gallery'],
  [queryString.stringify({series: 'sword-and-shield', set: 'brilliant-stars'}), 'swsh09-brilliant-stars'],
  [queryString.stringify({series: 'sword-and-shield', set: 'fusion-strike'}), 'swsh08-fusion-strike'],
  [queryString.stringify({series: 'sword-and-shield', set: 'evolving-skies'}), 'swsh07-evolving-skies'],
  [queryString.stringify({series: 'sword-and-shield', set: 'chilling-reign'}), 'swsh06-chilling-reign'],
  [queryString.stringify({series: 'sword-and-shield', set: 'battle-styles'}), 'swsh05-battle-styles'],
  [queryString.stringify({series: 'sword-and-shield', set: 'shining-fates'}), 'shining-fates'],
  [queryString.stringify({series: 'sword-and-shield', set: 'vivid-voltage'}), 'swsh04-vivid-voltage'],
  [queryString.stringify({series: 'sword-and-shield', set: 'champions-path'}), 'champions-path'],
  [queryString.stringify({series: 'sword-and-shield', set: 'darkness-ablaze'}), 'swsh03-darkness-ablaze'],
  [queryString.stringify({series: 'sword-and-shield', set: 'rebel-clash'}), 'swsh02-rebel-clash'],
  [queryString.stringify({series: 'sword-and-shield', set: 'sword-and-shield'}), 'swsh01-sword-and-shield-base-set'],
  [queryString.stringify({series: 'sword-and-shield', set: 'swsh-black-star-promos'}), 'swsh-sword-and-shield-promo-cards'],
  [queryString.stringify({series: 'sun-and-moon', set: 'hidden-fates'}), 'hidden-fates'],
  [queryString.stringify({series: 'sun-and-moon', set: 'unbroken-bonds'}), 'sm-unbroken-bonds'],
  [queryString.stringify({series: 'sun-and-moon', set: 'cosmic-eclipse'}), 'sm-cosmic-eclipse'],
  [queryString.stringify({series: 'sun-and-moon', set: 'unified-minds'}), 'sm-unified-minds'],
  [queryString.stringify({series: 'sun-and-moon', set: 'detective-pikachu'}), 'detective-pikachu'],
  [queryString.stringify({series: 'sun-and-moon', set: 'team-up'}), 'sm-team-up'],
  [queryString.stringify({series: 'sun-and-moon', set: 'shiny-vault'}), 'hidden-fates-shiny-vault'],
  [queryString.stringify({series: 'sun-and-moon', set: 'forbidden-light'}), 'sm-forbidden-light'],
  [queryString.stringify({series: 'sun-and-moon', set: 'celestial-storm'}), 'sm-celestial-storm'],
  [queryString.stringify({series: 'sun-and-moon', set: 'lost-thunder'}), 'sm-lost-thunder'],
  [queryString.stringify({series: 'sun-and-moon', set: 'dragon-majesty'}), 'dragon-majesty'],
  [queryString.stringify({series: 'sun-and-moon', set: 'ultra-prism'}), 'sm-ultra-prism'],
  [queryString.stringify({series: 'sun-and-moon', set: 'sm-black-star-promos'}), 'sm-promos'],
  [queryString.stringify({series: 'sun-and-moon', set: 'crimson-invasion'}), 'sm-crimson-invasion'],
  [queryString.stringify({series: 'sun-and-moon', set: 'sun-and-moon'}), 'sm-base-set'],
  [queryString.stringify({series: 'sun-and-moon', set: 'burning-shadows'}), 'sm-burning-shadows'],
  [queryString.stringify({series: 'sun-and-moon', set: 'shining-legends'}), 'shining-legends'],
  [queryString.stringify({series: 'sun-and-moon', set: 'guardians-rising'}), 'sm-guardians-rising'],
  [queryString.stringify({series: 'xy', set: 'fates-collide'}), 'xy-fates-collide'],
  [queryString.stringify({series: 'xy', set: 'generations'}), 'generations'],
  [queryString.stringify({series: 'xy', set: 'breakpoint'}), 'xy-breakpoint'],
  [queryString.stringify({series: 'xy', set: 'evolutions'}), 'xy-evolutions'],
  [queryString.stringify({series: 'xy', set: 'steam-siege'}), 'xy-steam-siege'],
  [queryString.stringify({series: 'xy', set: 'breakthrough'}), 'xy-breakthrough'],
  [queryString.stringify({series: 'xy', set: 'primal-clash'}), 'xy-primal-clash'],
  [queryString.stringify({series: 'xy', set: 'roaring-skies'}), 'xy-roaring-skies'],
  [queryString.stringify({series: 'xy', set: 'double-crisis'}), 'double-crisis'],
  [queryString.stringify({series: 'xy', set: 'ancient-origins'}), 'xy-ancient-origins'],
  [queryString.stringify({series: 'xy', set: 'furious-fists'}), 'xy-furious-fists'],
  [queryString.stringify({series: 'xy', set: 'phantom-forces'}), 'xy-phantom-forces'],
  [queryString.stringify({series: 'xy', set: 'flashfire'}), 'xy-flashfire'],
  [queryString.stringify({series: 'xy', set: 'xy-black-star-promos'}), 'xy-promos'],
  [queryString.stringify({series: 'xy', set: 'kalos-starter-set'}), 'kalos-starter-set'],
  [queryString.stringify({series: 'xy', set: 'xy'}), 'xy-base-set'],
  [queryString.stringify({series: 'black-and-white', set: 'legendary-treasures'}), 'legendary-treasures'],
  [queryString.stringify({series: 'black-and-white', set: 'plasma-storm'}), 'plasma-storm'],
  [queryString.stringify({series: 'black-and-white', set: 'plasma-freeze'}), 'plasma-freeze'],
  [queryString.stringify({series: 'black-and-white', set: 'plasma-blast'}), 'plasma-blast'],
  [queryString.stringify({series: 'black-and-white', set: 'dragon-vault'}), 'dragon-vault'],
  [queryString.stringify({series: 'black-and-white', set: 'boundaries-crossed'}), 'boundaries-crossed'],
  [queryString.stringify({series: 'black-and-white', set: 'next-destinies'}), 'next-destinies'],
  [queryString.stringify({series: 'black-and-white', set: 'dragons-exalted'}), 'dragons-exalted'],
  [queryString.stringify({series: 'black-and-white', set: 'dark-explorers'}), 'dark-explorers'],
  [queryString.stringify({series: 'black-and-white', set: 'bw-black-star-promos'}), 'black-and-white-promos'],
  [queryString.stringify({series: 'black-and-white', set: 'emerging-powers'}), 'emerging-powers'],
  [queryString.stringify({series: 'black-and-white', set: 'black-and-white'}), 'black-and-white'],
  [queryString.stringify({series: 'black-and-white', set: 'noble-victories'}), 'noble-victories'],
  [queryString.stringify({series: 'heartgold-and-soulsilver', set: 'call-of-legends'}), 'call-of-legends'],
  [queryString.stringify({series: 'heartgold-and-soulsilver', set: 'heartgold-and-soulsilver'}), 'heartgold-soulsilver'],
  [queryString.stringify({series: 'heartgold-and-soulsilver', set: 'hgss-black-star-promos'}), 'hgss-promos'],
  [queryString.stringify({series: 'heartgold-and-soulsilver', set: 'hs-undaunted'}), 'undaunted'],
  [queryString.stringify({series: 'heartgold-and-soulsilver', set: 'hs-triumphant'}), 'triumphant'],
  [queryString.stringify({series: 'heartgold-and-soulsilver', set: 'hs-unleashed'}), 'unleashed'],
  [queryString.stringify({series: 'other', set: 'pokémon-rumble'}), 'rumble_new'],
  [queryString.stringify({series: 'platinum', set: 'supreme-victors'}), 'supreme-victors'],
  [queryString.stringify({series: 'platinum', set: 'rising-rivals'}), 'rising-rivals'],
  [queryString.stringify({series: 'platinum', set: 'platinum'}), 'platinum'],
  [queryString.stringify({series: 'platinum', set: 'arceus'}), 'arceus'],
  [queryString.stringify({series: 'diamond-and-pearl', set: 'stormfront'}), 'stormfront'],
  [queryString.stringify({series: 'diamond-and-pearl', set: 'majestic-dawn'}), 'majestic-dawn'],
  [queryString.stringify({series: 'diamond-and-pearl', set: 'great-encounters'}), 'great-encounters'],
  [queryString.stringify({series: 'diamond-and-pearl', set: 'legends-awakened'}), 'legends-awakened'],
  [queryString.stringify({series: 'diamond-and-pearl', set: 'secret-wonders'}), 'secret-wonders'],
  [queryString.stringify({series: 'diamond-and-pearl', set: 'diamond-and-pearl'}), 'diamond-and-pearl'],
  [queryString.stringify({series: 'diamond-and-pearl', set: 'dp-black-star-promos'}), 'diamond-and-pearl-promos'],
  [queryString.stringify({series: 'diamond-and-pearl', set: 'mysterious-treasures'}), 'mysterious-treasures'],
  [queryString.stringify({series: 'pop', set: 'pop-series-9'}), 'pop-series-9'],
  [queryString.stringify({series: 'pop', set: 'pop-series-8'}), 'pop-series-8'],
  [queryString.stringify({series: 'pop', set: 'pop-series-7'}), 'pop-series-7'],
  [queryString.stringify({series: 'pop', set: 'pop-series-6'}), 'pop-series-6'],
  [queryString.stringify({series: 'pop', set: 'pop-series-5'}), 'pop-series-5'],
  [queryString.stringify({series: 'pop', set: 'pop-series-4'}), 'pop-series-4'],
  [queryString.stringify({series: 'pop', set: 'pop-series-3'}), 'pop-series-3'],
  [queryString.stringify({series: 'pop', set: 'pop-series-2'}), 'pop-series-2'],
  [queryString.stringify({series: 'pop', set: 'pop-series-1'}), 'pop-series-1'],
  [queryString.stringify({series: 'ex', set: 'power-keepers'}), 'power-keepers'],
  [queryString.stringify({series: 'ex', set: 'dragon-frontiers'}), 'dragon-frontiers'],
  [queryString.stringify({series: 'ex', set: 'legend-maker'}), 'legend-maker'],
  [queryString.stringify({series: 'ex', set: 'crystal-guardians'}), 'crystal-guardians'],
  [queryString.stringify({series: 'ex', set: 'holon-phantoms'}), 'holon-phantoms'],
  [queryString.stringify({series: 'ex', set: 'delta-species'}), 'delta-species'],
  [queryString.stringify({series: 'ex', set: 'emerald'}), 'emerald'],
  [queryString.stringify({series: 'ex', set: 'unseen-forces'}), 'unseen-forces'],
  [queryString.stringify({series: 'ex', set: 'deoxys'}), 'deoxys'],
  [queryString.stringify({series: 'ex', set: 'team-rocket-returns'}), 'team-rocket-returns'],
  [queryString.stringify({series: 'ex', set: 'firered-and-leafgreen'}), 'firered-and-leafgreen'],
  [queryString.stringify({series: 'ex', set: 'hidden-legends'}), 'hidden-legends'],
  [queryString.stringify({series: 'ex', set: 'team-magma-vs-team-aqua'}), 'team-magma-vs-team-aqua'],
  [queryString.stringify({series: 'ex', set: 'ruby-and-sapphire'}), 'ruby-and-sapphire'],
  [queryString.stringify({series: 'ex', set: 'sandstorm'}), 'sandstorm'],
  [queryString.stringify({series: 'ex', set: 'dragon'}), 'dragon'],
  [queryString.stringify({series: 'np', set: 'nintendo-black-star-promos'}), 'nintendo-promos'],
  [queryString.stringify({series: 'e-card', set: 'aquapolis'}), 'aquapolis'],
  [queryString.stringify({series: 'e-card', set: 'skyridge'}), 'skyridge'],
  [queryString.stringify({series: 'e-card', set: 'expedition-base-set'}), 'expedition'],
  [queryString.stringify({series: 'other', set: 'mcdonalds-collection-2019'}), 'mcdonalds-promos-2019'],
  [queryString.stringify({series: 'other', set: 'mcdonalds-collection-2016'}), 'mcdonalds-promos-2016'],
  [queryString.stringify({series: 'other', set: 'mcdonalds-collection-2012'}), 'mcdonalds-promos-2012'],
  [queryString.stringify({series: 'other', set: 'mcdonalds-collection-2011'}), 'mcdonalds-promos-2011'],
  [queryString.stringify({series: 'other', set: 'legendary-collection-unlimited'}), 'legendary-collection'],
  [queryString.stringify({series: 'other', set: 'southern-islands-unlimited'}), 'southern-islands'],
  [queryString.stringify({series: 'neo', set: 'neo-destiny-unlimited'}), 'neo-destiny'],
  [queryString.stringify({series: 'neo', set: 'neo-revelation-unlimited'}), 'neo-revelation'],
  [queryString.stringify({series: 'neo', set: 'neo-discovery-unlimited'}), 'neo-discovery'],
  [queryString.stringify({series: 'neo', set: 'neo-genesis-unlimited'}), 'neo-genesis'],
  [queryString.stringify({series: 'gym', set: 'gym-heroes-unlimited'}), 'gym-heroes'],
  [queryString.stringify({series: 'gym', set: 'gym-challenge-unlimited'}), 'gym-challenge'],
  [queryString.stringify({series: 'base', set: 'base-set-2-unlimited'}), 'base-set-2'],
  [queryString.stringify({series: 'base', set: 'team-rocket-unlimited'}), 'team-rocket'],
  [queryString.stringify({series: 'base', set: 'jungle-unlimited'}), 'jungle'],
  [queryString.stringify({series: 'base', set: 'fossil-unlimited'}), 'fossil'],
  [queryString.stringify({series: 'base', set: 'wizards-black-star-promos-unlimited'}), 'wotc-promo'],
  [queryString.stringify({series: 'base', set: 'base-unlimited'}), 'base-set'],
]);

const getMarketData = async (series:string, set:string):Promise<string> => {
  const seriesSet = {series, set};
  const urlSlug = seriesSetToUrlSlug.get(queryString.stringify(seriesSet));
  if (!urlSlug) {
    throw new NotFoundError(`Failed to find url slug for Series: ${seriesSet.series}, Set: ${seriesSet.set}`);
  }
  const url = `https://shop.tcgplayer.com/price-guide/pokemon/${urlSlug}`;
  const response:string = await baseExternalClient.get<string>(url, null, null);
  return response;
}

export const tcgPlayerHtmlClient = {
  getMarketData,
}