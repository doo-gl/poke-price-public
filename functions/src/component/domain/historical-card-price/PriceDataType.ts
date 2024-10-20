

export enum PriceDataType {
  SOURCE_PRICE = 'SOURCE_PRICE', // The intrinsic price this data source thinks a card has
  SOLD_PRICE = 'SOLD_PRICE', // The price that this card was sold at
  BEST_OFFER_ACCEPTED = 'BEST_OFFER_ACCEPTED', // The card was sold for a lower price than shown
  LISTING_PRICE = 'LISTING_PRICE', // The price at which a card was listed, but not necessarily, sold
}