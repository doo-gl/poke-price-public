import {capitaliseKey} from "../../tools/KeyConverter";
import {CurrencyAmount, fromCurrencyAmountLike} from "../money/CurrencyAmount";
import {Content} from "./PublicCardDto";
import {ItemEntity, PriceType, SingleCardItemDetails} from "../item/ItemEntity";
import {itemPriceQuerier} from "../item/ItemPriceQuerier";
import {CurrencyCode} from "../money/CurrencyCodes";
import {genericContentMapper, paragraph} from "../item/GenericContentMapper";

const EMPTY:Content = { type: "empty", children: [] };

const name = (card:ItemEntity, itemDetails:SingleCardItemDetails):Content => {
  const fullName = card.displayName || capitaliseKey(card.name);
  const setName = capitaliseKey(itemDetails.set);
  const setNumber = itemDetails.setNumber;
  const cardNumber = itemDetails.cardNumber;
  const hasSetNumber = setNumber && setNumber.length > 0;
  const startsWithLetter = cardNumber.match(/^[a-zA-Z]+/gim)
  const code = hasSetNumber && !startsWithLetter
    ? `${cardNumber.toUpperCase()} / ${cardNumber.toUpperCase()}`
    : cardNumber.toUpperCase();
  return {
    type: 'text', children: [
      { type: 'text', children: 'The ' },
      { type: 'bold', children: `${fullName} (${code})` },
      { type: 'text', children: ` card can be found in the ` },
      { type: 'bold', children: `${setName}` },
      { type: 'text', children: ` set.` },
    ],
  }
}

const rarityArtist = (card:ItemEntity, itemDetails:SingleCardItemDetails):Content => {
  const artist = itemDetails.artist;
  const rarity = itemDetails.rarity;
  if (rarity && artist) {
    return {
      type: 'text', children: [
        { type: "text", children: `This ` },
        { type: "bold", children: `${capitaliseKey(rarity)}` },
        { type: "text", children: ` card was illustrated by ` },
        { type: "bold", children: `${artist}` },
        { type: "text", children: `.` },
      ],
    }
  }
  if (rarity) {
    return {
      type: 'text', children: [
        { type: "text", children: `This is a ` },
        { type: "bold", children: `${capitaliseKey(rarity)}` },
        { type: "text", children: ` card.` },
      ],
    }
  }
  if (artist) {
    return {
      type: 'text', children: [
        { type: "text", children: `This card was illustrated by ` },
        { type: "bold", children: `${artist}` },
        { type: "text", children: `.` },
      ],
    }
  }
  return EMPTY;
}

const subType = (card:ItemEntity, itemDetails:SingleCardItemDetails):Content => {
  const subTypes = itemDetails.subTypes
  if (!subTypes || subTypes.length === 0) {
    return EMPTY;
  }
  if (subTypes.some(st => st === 'v')) {
    return {
      type: 'text', children: [
        { type: "text", children: `The fact that it is a ` },
        { type: "bold", children: `V` },
        { type: "text", children: ` card makes it one of the more valuable cards.` },
      ],
    }
  }
  if (subTypes.some(st => st === 'vmax')) {
    return {
      type: 'text', children: [
        { type: "text", children: `The fact that it is a ` },
        { type: "bold", children: `VMAX` },
        { type: "text", children: ` card makes it one of the more valuable cards.` },
      ],
    }
  }
  if (subTypes.some(st => st === 'ex')) {
    return {
      type: 'text', children: [
        { type: "text", children: `The fact that it is a ` },
        { type: "bold", children: `EX` },
        { type: "text", children: ` card makes it one of the more valuable cards.` },
      ],
    }
  }
  if (subTypes.some(st => st === 'gx')) {
    return {
      type: 'text', children: [
        { type: "text", children: `The fact that it is a ` },
        { type: "bold", children: `GX` },
        { type: "text", children: ` card makes it one of the more valuable cards.` },
      ],
    }
  }
  return EMPTY;
}

const map = (card:ItemEntity, itemDetails:SingleCardItemDetails):Content => {
  return {
    type: 'section',
    children: [
      paragraph([name(card, itemDetails), genericContentMapper.sold(card)]),
      paragraph([genericContentMapper.open(card), genericContentMapper.volatility(card)]),
      paragraph([rarityArtist(card, itemDetails), subType(card, itemDetails)]),
    ],
  }
}

export const cardContentMapperV2 = {
  map,
}