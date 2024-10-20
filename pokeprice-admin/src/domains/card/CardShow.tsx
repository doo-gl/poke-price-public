import React from "react"
import {
  BooleanField,
  DateField,
  EditButton,
  ImageField,
  NumberField, ReferenceArrayField,
  ReferenceField,
  Show,
  ShowProps, SingleFieldList,
  Tab,
  TabbedShowLayout,
  TextField,
  TopToolbar,
  UrlField,
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

const useStyles = makeStyles({
  image: {
    height: 330,
    width: 240,
    maxHeight: 330,
  }
})

export const CardShow = (props:ShowProps) => {
  const styles = useStyles();
  const {record} = useShowController(props);
  return (
    <Show {...props}>
      <TabbedShowLayout>
        <Tab label='Details'>
          <TextField source="id" />
          <TextField source="name" />
          <CurrencyAmountField source="pokePriceV2.soldPrice" label="PokePrice" addLabel />
          <NumberField source="pokePriceV2.soldVolume" label='Sold Volume' />
          <UrlField source="soldUrl" label='Sold listing url' target='_blank' />
          <UrlField source="listingUrl" label='Open listing url' target='_blank' />
          <CurrencyAmountField source="pokePriceV2.listingMinPrice" label="Minimum Open Listing Price" addLabel />
          <CurrencyAmountField source="pokePriceV2.listingPrice" label="Median Open Listing Price" addLabel />
          <NumberField source="pokePriceV2.listingVolume" label='Listing Volume' />
          <NumberField source="priority" label='priority' />
          <DateField source="nextPokePriceCalculationTime" showTime/>
          <DateField source="mostRecentEbayOpenListingSourcing" showTime/>
          <DateField source="mostRecentStatCalculation" showTime/>
          <DateField source="dateCreated" showTime/>
          <DateField source="dateLastModified" showTime/>
          <TextField source="series" />
          <ReferenceField source="setId" reference="set" link='show'>
            <TextField source="set" />
          </ReferenceField>
          <ReferenceField label='Set Id' source="setId" reference="set" link='show'>
            <TextField source="id" />
          </ReferenceField>
          <TextField source="name" />
          <TextField source="numberInSet" />
          <NumberField source="displaySetNumber" />
          <BareArrayField source="searchKeywords.includes" addLabel />
          <BareArrayField source="searchKeywords.excludes" addLabel />
          <BareArrayField source="searchKeywords.ignores" addLabel />

          <UrlField label='Pokemon TCG link' source="externalIdentifiers.POKEMON_TCG_API.url" />
          <ImageField label='Image' source="image.hiResUrl" classes={styles} />
          <TextField source="rarity" />
          <TextField source="superType" />
          <TextField source="subTypes" />
          <TextField source="types" />
          <TextField source="pokemon" />
          <BooleanField source="visible" />
          <TextField source="fullName" />
          <TextField source="artist" />
          <TextField source="flavourText" />
        </Tab>
        <Tab label='Sold PokePrice'>
          <NumberField source="pokePriceV2.soldVolume" label="Volume" />
          <CurrencyAmountField addLabel label="Min" source="pokePriceV2.soldMinPrice" />
          <CurrencyAmountField addLabel label="Low" source="pokePriceV2.soldLowPrice" />
          <CurrencyAmountField addLabel label="Price" source="pokePriceV2.soldPrice" />
          <CurrencyAmountField addLabel label="High" source="pokePriceV2.soldHighPrice" />
          <CurrencyAmountField addLabel label="Max" source="pokePriceV2.soldMaxPrice" />
          <DateField source="pokePriceV2.soldLastUpdatedAt" showTime/>
          <DateField source="pokePriceV2.soldMostRecentPrice" showTime/>
          <ReferenceArrayField label="Stats" reference={DOMAIN.CARD_STATS_V2} source="pokePriceV2.soldStatIds">
            <SingleFieldList linkType='show' >
              <TextField source="id" style={{margin: 5}}/>
            </SingleFieldList>
          </ReferenceArrayField>
        </Tab>
        <Tab label='Listing PokePrice'>
          <NumberField source="pokePriceV2.listingVolume" label="Volume" />
          <CurrencyAmountField addLabel label="Min" source="pokePriceV2.listingMinPrice" />
          <CurrencyAmountField addLabel label="Low" source="pokePriceV2.listingLowPrice" />
          <CurrencyAmountField addLabel label="Price" source="pokePriceV2.listingPrice" />
          <CurrencyAmountField addLabel label="High" source="pokePriceV2.listingHighPrice" />
          <CurrencyAmountField addLabel label="Max" source="pokePriceV2.listingMaxPrice" />
          <DateField source="pokePriceV2.listingLastUpdatedAt" showTime/>
          <DateField source="pokePriceV2.listingMostRecentPrice" showTime/>
          <ReferenceArrayField label="Stats" reference={DOMAIN.CARD_STATS_V2} source="pokePriceV2.listingStatIds">
            <SingleFieldList linkType='show' >
              <TextField source="id" style={{margin: 5}}/>
            </SingleFieldList>
          </ReferenceArrayField>
        </Tab>
        <Tab label='Links'>
          <GoToListField source='id' queryField='cardId' label='Go to Sold Listings' domain={DOMAIN.HISTORICAL_CARD_PRICE} />
          <GoToListField source='id' queryField='cardId' label='Go to Open Listings' domain={DOMAIN.EBAY_OPEN_LISTING} />
          <GoToListField source='id' queryField='cardId' label='Go to Card Search Params' domain={DOMAIN.EBAY_SEARCH_PARAMS} />
          <GoToListField source='id' queryField='cardId' label='Go to Card Stats' domain={DOMAIN.CARD_PRICE_STATS} />
          <GoToListField source='id' queryField='cardId' label='Go to Card Stats V2' domain={DOMAIN.CARD_STATS_V2} />
          <GoToListField source='id' queryField='cardId' label='Go to Card Selections' domain={DOMAIN.CARD_SELECTION} />
          <GoToListField source='id' queryField='importData.cardId' label='Go to Card Price Import Attempts' domain={DOMAIN.CARD_PRICE_DATA_IMPORT_ATTEMPT} />
          <Button variant="outlined" component={Link} to={{pathname: `/${DOMAIN.CARD}/${record?.id}/update-keywords`,}}>Update Card Search Keywords</Button>
          <Button variant="outlined" component={Link} to={{pathname: `/${DOMAIN.CARD}/${record?.id}/update-image`,}}>Update Card Image</Button>
          <Button variant="outlined" component={Link} to={{pathname: `/${DOMAIN.CARD}/${record?.id}/submit-list-html`,}}>Submit Ebay List Html</Button>
          <Button variant="outlined" component={Link} to={{pathname: `/${DOMAIN.CARD}/${record?.id}/update-visibility`,}}>Update Card Visibility</Button>
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