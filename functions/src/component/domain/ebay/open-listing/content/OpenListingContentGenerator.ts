import {EbayOpenListingEntity} from "../EbayOpenListingEntity";
import {
  bold,
  Content,
  ContentItem,
  heading1,
  heading2,
  ifExists, list,
  listItem,
  paragraph,
  section,
  text,
} from "./ContentItem";
import {CurrencyAmount, fromCurrencyAmountLike, fromOptionalCurrencyAmountLike} from "../../../money/CurrencyAmount";
import {timestampToMoment} from "../../../../tools/TimeConverter";
import {cardConditionLabel} from "../../../historical-card-price/CardCondition";

const mapScoreToRating = (score:number):string => {
  if (score > 90) {
    return 'very good'
  }
  if (score > 50) {
    return 'good'
  }
  if (score >= 0) {
    return 'average';
  }
  if (score > -50) {
    return 'poor'
  }
  return 'very poor'
}

const generateTitle = (listing:EbayOpenListingEntity):string => {
  const currentPrice = fromCurrencyAmountLike(listing.mostRecentPrice);
  const endTime = listing.listingEndTime ? timestampToMoment(listing.listingEndTime) : null;
  const isBuyNow = !!listing.buyItNowPrice;
  const prefix = endTime
    ? `Ends: ${endTime.format('DD MMM - HH:mm')}`
    : isBuyNow ? 'Buy Now' : null
  return `${listing.listingName} - Current Price: ${currentPrice}${prefix ? `- ${prefix}` : ''}`
}

const generateDescription = (listing:EbayOpenListingEntity):string => {
  const specifics = Object.entries(listing.listingSpecifics);
  if (specifics.length === 0) {
    return `${generateTitle(listing)} - ${listing.listingDescription}`
  }
  return specifics.map(entry => `${entry[0]}: ${entry[1]}`).join(' | ')
}

const generateShortContent = (listing:EbayOpenListingEntity):Content => {
  const listingPrice = fromCurrencyAmountLike(listing.mostRecentPrice);
  const buyItNowPrice = fromOptionalCurrencyAmountLike(listing.buyItNowPrice);
  const currentBids = listing.mostRecentBidCount;
  const lastUpdated = timestampToMoment(listing.mostRecentUpdate).format('DD MMM - HH:mm')
  const endTime = listing.listingEndTime
    ? timestampToMoment(listing.listingEndTime).format('DD MMM - HH:mm')
    : null;
  const buyingOpportunityScore = listing.buyingOpportunity?.score ?? null;
  return section([
    heading1(listing.listingName),
    paragraph([
      paragraph([
        text([
          text('The listing is currently worth '), bold(listingPrice.toString()), text(' in a '),
          bold(cardConditionLabel(listing.condition)), text(' condition, which was last updated at '), bold(lastUpdated),
        ]),
      ]),
      paragraph([
        ifExists(buyItNowPrice,
          (price:CurrencyAmount) => text([text('It is available to buy now for '), bold(price.toString()), text('.')])
        ),
        ifExists(currentBids,
          (bids) => text([text('There are currently '), bold(`${bids}`), text(' different bids for this item.')])
        ),
        ifExists(endTime,
          (end) => text([text('The listing ends at '), bold(`${end}`), text('.')])
        ),
      ]),
      paragraph(
        ifExists(buyingOpportunityScore,
          (score) => text([text('Our AI thinks this is a '), bold(mapScoreToRating(score)), text(' buying opportunity.')])
        ),
      ),
    ]),
  ])
}

const generateLongContent = (listing:EbayOpenListingEntity):Content => {
  const listingPrice = fromCurrencyAmountLike(listing.mostRecentPrice);
  const buyItNowPrice = fromOptionalCurrencyAmountLike(listing.buyItNowPrice);
  const currentBids = listing.mostRecentBidCount;
  const lastUpdated = timestampToMoment(listing.mostRecentUpdate).format('DD MMM - HH:mm')
  const endTime = listing.listingEndTime
    ? timestampToMoment(listing.listingEndTime).format('DD MMM - HH:mm')
    : null;
  const buyingOpportunityScore = listing.buyingOpportunity?.score ?? null;
  const specifics = Object.entries(listing.listingSpecifics).length > 0
    ? Object.entries(listing.listingSpecifics).map(entry => `${entry[0]} - ${entry[1]}`)
    : null
  return section([
    heading1(listing.listingName),
    paragraph([
      paragraph([
        text([
          text('The listing is currently worth '), bold(listingPrice.toString()), text(' in a '),
          bold(cardConditionLabel(listing.condition)), text(' condition, which was last updated at '), bold(lastUpdated),
        ]),
      ]),
      paragraph([
        ifExists(buyItNowPrice,
          (price:CurrencyAmount) => text([text('It is available to buy now for '), bold(price.toString()), text('.')])
        ),
        ifExists(currentBids,
          (bids) => text([text('There are currently '), bold(`${bids}`), text(' different bids for this item.')])
        ),
        ifExists(endTime,
          (end) => text([text('The listing ends at '), bold(`${end}`), text('.')])
        ),
      ]),
      ifExists(buyingOpportunityScore,
        (score) => paragraph(
          text([text('Our AI thinks this is a '), bold(mapScoreToRating(score)), text(' buying opportunity.')])
        )
      ),
    ]),
    paragraph([
      heading2('Details'),
      ifExists(listing.listingDescription || listing.sellersNotes,
        () => paragraph([
          paragraph('Sellers Notes: '),
          ifExists(listing.listingDescription, (desc) => text(desc, {size: 'small'})),
          ifExists(listing.sellersNotes, (desc) => text(desc, {size: 'small'})),
        ])
      ),
      ifExists(specifics,
        (specs) => paragraph([
          paragraph('Listing specifics:'),
          paragraph(list(specs.map(spec => listItem(text(spec))))),
        ])
      ),
    ]),
  ])
}

const generate = (listing:EbayOpenListingEntity):ContentItem => {
  return {
    title: generateTitle(listing),
    description: generateDescription(listing),
    shortContent: generateShortContent(listing),
    longContent: generateLongContent(listing),
  }
}

export const openListingContentGenerator = {
  generate,
}