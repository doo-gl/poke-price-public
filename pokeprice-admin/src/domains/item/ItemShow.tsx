import React from "react"
import {
  ArrayField,
  BooleanField,
  Datagrid,
  DateField,
  FunctionField,
  NumberField,
  Show,
  ShowProps,
  Tab,
  TabbedShowLayout,
  TextField,
  useRecordContext,
  useShowController
} from "react-admin";
import {Button, makeStyles} from "@material-ui/core";
import {Refresh, Search} from "@material-ui/icons"
import {GoToListField} from "../../components/GoToListField";
import {DOMAIN} from "../Domains";
import {CurrencyAmountField} from "../../components/CurrencyAmountField";
import {BareArrayField} from "../../components/BareArrayField";
import {SubmitButton} from "../../components/SubmitButton";
import {adminClient} from "../../infrastructure/AdminClient";
import {Link} from "react-router-dom";
import moment from "moment";
import {saveAs} from "file-saver";
import {JsonField} from "react-admin-json-view";
import {lodash} from "../../external-lib/Lodash";
import {itemPriceQuerier, PriceType} from "../../common/ItemPriceQuerier";
import {comparatorBuilder} from "../../common/ComparatorBuilder";

const useStyles = makeStyles({
  image: {
    height: 330,
    width: 240,
    maxHeight: 330,
  }
})

const ExpandPriceView = (props:any) => {
  const record = props.record
  const statIds = record?.statIds ?? []
  return (
    <div>
      Stat Ids
      <ul>
        {statIds.map((id:any) => (
          <li>
            <a href={`/#/${DOMAIN.CARD_STATS_V2}/${id}/show`}>
              {id}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

const IsPokePriceField = (props:any) => {
  const recordContext = useRecordContext(props)
  const fullRecord = recordContext?.record;
  const record = props.record
  const priceType = record.priceType
  const currencyCode = record.currencyCode
  const details = itemPriceQuerier.query(currencyCode, priceType, fullRecord.itemPrices)
  const isPokePrice = details
    && details.price?.amountInMinorUnits === record.price?.amountInMinorUnits
    && details.volume === record.volume
    && details?.periodSizeDays === record.periodSizeDays
  return <BooleanField label="Is Poke Price" record={{id: 'isPokePrice', isPokePrice}} source="isPokePrice" />
}

const PriceTypeArrayField = (props:any) => {
  const prices = lodash.get(props.record, 'itemPrices.prices')
  if (!prices) {
    return null
  }
  const listingPrices = prices
    .filter((price:any) => price.priceType === props.priceType)
    .sort(comparatorBuilder.combineAll<any>(
      comparatorBuilder.objectAttributeASC(value => value.currencyCode),
      comparatorBuilder.objectAttributeASC(value => value.periodSizeDays),
    ))
  return (
    <ArrayField  record={{id: 'listing', prices: listingPrices}} source="prices" >
      <Datagrid expand={<ExpandPriceView/>}>
        <TextField source="currencyCode" />
        <TextField source="priceType" />
        <IsPokePriceField label="Is Poke Price" />
        <NumberField source="periodSizeDays" />
        <CurrencyAmountField source="minPrice" />
        <CurrencyAmountField source="lowPrice" />
        <CurrencyAmountField source="price" />
        <CurrencyAmountField source="highPrice" />
        <CurrencyAmountField source="maxPrice" />
        <NumberField source="volume" />
        <FunctionField label="Currencies used" render={(value:any) => `${value.currenciesUsed.join(', ')}`} />
      </Datagrid>
    </ArrayField>
  )
}

const ItemImageField = (props:any) => {
  const variants = props.image?.variants ?? [];
  if (!variants || variants.length === 0) {
    return null
  }
  return (
    <div style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap'}}>

      {variants.map((variant:any) => (
        <div key={variant.url} style={{margin: 8}}>
          <img src={variant.url} style={{maxHeight: 200}} />
          <div>
            <div>Size: {variant.size ? `${variant.size / 1000}kb` : 'NOT SET'}</div>
            <div>Format: {variant?.format ?? 'NOT SET'}</div>
            <div>Height: {variant?.dimensions?.height ?? 'NOT SET'}</div>
            <div>Width: {variant?.dimensions?.width ?? 'NOT SET'}</div>
            <div>Tags: {(variant?.tags ?? []).join(', ')}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

const ItemImagesField = (props:any) => {
  const images = lodash.get(props.record, 'images.images')
  if (!images) {
    return null
  }
  return (
    <div style={{background: '#ebebeb', marginBottom: 16}}>
      {images.map((image:any, index:number) => (
        <div>
          <h4>
            Image: {index}
          </h4>
          <ItemImageField key={index} image={image} />
        </div>

      ))}
    </div>
  )
}

export const ItemShow = (props:ShowProps) => {
  const styles = useStyles();
  const {record} = useShowController(props);
  record?.tags.sort()
  return (
    <Show {...props}>
      <TabbedShowLayout>
        <Tab label='Details'>
          <TextField source="id" />
          <TextField source="displayName" />
          <TextField source="slug" />
          <TextField source="description" />
          <TextField source="itemType" />
          <JsonField source="itemDetails" addLabel reactJsonOptions={{collapsed: true}} />
          <JsonField source="metadata" addLabel reactJsonOptions={{collapsed: true}} />
          <JsonField source="identifiers" addLabel reactJsonOptions={{collapsed: true}} />
          <JsonField source="searchKeywords" addLabel reactJsonOptions={{collapsed: true}} />
          <BareArrayField source="tags" addLabel />
          <JsonField source="searchTags" addLabel reactJsonOptions={{collapsed: true}} />

          <DateField source="dateCreated" showTime/>
          <DateField source="dateLastModified" showTime/>
          <DateField source="nextPokePriceCalculationTime" showTime/>
          <DateField source="nextStatsCalculationTime" showTime/>
          <DateField source="nextEbayOpenListingSourcingTime" showTime/>



        </Tab>
        <Tab label='Prices'>

          <PriceTypeArrayField label="Sale Prices" addLabel priceType={PriceType.SALE} />
          <PriceTypeArrayField label="Listing Prices" addLabel priceType={PriceType.LISTING} />
        </Tab>
        <Tab label='Images'>
          <ItemImagesField />
        </Tab>
        <Tab label='Links'>
          <GoToListField queryValueExtractor={(rec:any) => rec?.legacyId ?? rec?.id} source='id' queryField='cardId' label='Go to Sold Listings' domain={DOMAIN.HISTORICAL_CARD_PRICE} />
          <GoToListField queryValueExtractor={(rec:any) => rec?.legacyId ?? rec?.id} source='id' queryField='cardId' label='Go to Open Listings' domain={DOMAIN.EBAY_OPEN_LISTING} />
          <GoToListField queryValueExtractor={(rec:any) => rec?.legacyId ?? rec?.id} source='id' queryField='cardId' label='Go to Card Search Params' domain={DOMAIN.EBAY_SEARCH_PARAMS} />
          <GoToListField queryValueExtractor={(rec:any) => rec?.legacyId ?? rec?.id} source='id' queryField='cardId' label='Go to Card Stats' domain={DOMAIN.CARD_PRICE_STATS} />
          <GoToListField queryValueExtractor={(rec:any) => rec?.legacyId ?? rec?.id} source='id' queryField='cardId' label='Go to Card Stats V2' domain={DOMAIN.CARD_STATS_V2} />
          <GoToListField queryValueExtractor={(rec:any) => rec?.legacyId ?? rec?.id} source='id' queryField='cardId' label='Go to Card Selections' domain={DOMAIN.CARD_SELECTION} />
          <GoToListField queryValueExtractor={(rec:any) => rec?.legacyId ?? rec?.id} source='id' queryField='importData.cardId' label='Go to Card Price Import Attempts' domain={DOMAIN.CARD_PRICE_DATA_IMPORT_ATTEMPT} />
          <Button variant="outlined" component={Link} to={{pathname: `/${DOMAIN.ITEM}/${record?.id}/update-keywords`,}}>Update Card Search Keywords</Button>
          <Button variant="outlined" component={Link} to={{pathname: `/${DOMAIN.ITEM}/${record?.id}/update-image`,}}>Update Card Image</Button>
          <Button variant="outlined" component={Link} to={{pathname: `/${DOMAIN.ITEM}/${record?.id}/submit-list-html`,}}>Submit Ebay List Html</Button>
          <Button variant="outlined" component={Link} to={{pathname: `/${DOMAIN.ITEM}/${record?.id}/update-visibility`,}}>Update Card Visibility</Button>
          <SubmitButton
            label='Backfill ebay sold listings'
            icon={<Search />}
            onPress={() => {
              if (!record) {
                throw new Error('No record')
              }
              return adminClient.backfillEbayListings(`${record.id}`)
            }}
          />
          <SubmitButton
            label='Source ebay open listings'
            icon={<Search />}
            onPress={() => {
              if (!record) {
                throw new Error('No record')
              }
              return adminClient.sourceOpenListings(`${record.id}`)
            }}
          />
          <SubmitButton
            label='Recalculate stats for card'
            icon={<Refresh />}
            onPress={() => {
              if (!record) {
                throw new Error('No record')
              }
              return adminClient.recalculateStatsForCard(`${record.id}`)
            }}
          />
          <SubmitButton
            label="Export Card Data"
            onPress={async () => {
              if (!record) {
                throw new Error('No record')
              }
              const json = await adminClient.getCardTestData(`${record.id}`)
              const now = moment().format('YYYY_MM_DD_HH_mm')
              saveAs(
                new Blob([JSON.stringify(json, null, 2)], {type: "application/json;charset=utf-8"}),
                `card_data_${record.id}_${now}.json`
              )
            }}
          />
        </Tab>
      </TabbedShowLayout>
    </Show>
  )
}