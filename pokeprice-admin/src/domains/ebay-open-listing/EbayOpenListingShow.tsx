import {
  ArrayField,
  BooleanField,
  Datagrid,
  DateField,
  NumberField,
  ReferenceArrayField,
  ReferenceField,
  Show,
  ShowProps,
  SingleFieldList,
  Tab,
  TabbedShowLayout,
  TextField,
  UrlField,
  useShowController
} from "react-admin";
import {CurrencyAmountField} from "../../components/CurrencyAmountField";
import {DOMAIN} from "../Domains";
import {ChipField} from "../../components/ChipField";
import {Archive, Done} from "@material-ui/icons";
import React from "react";
import {BareArrayField} from "../../components/BareArrayField";
import {SubmitButton} from "../../components/SubmitButton";
import {adminClient} from "../../infrastructure/AdminClient";


export const EbayOpenListingShow = (props:ShowProps) => {
  const {record} = useShowController(props);
  return (
    <Show {...props}>
      <TabbedShowLayout>
        <Tab label='Details'>
          <TextField source="id" />
          <ReferenceField source="cardId" reference={DOMAIN.ITEM} link='show'>
            <TextField source="id" />
          </ReferenceField>
          <ReferenceField source="historicalCardPriceId" reference={DOMAIN.HISTORICAL_CARD_PRICE} link='show'>
            <TextField source="id" />
          </ReferenceField>
          <TextField source='state' />

          <CurrencyAmountField source='mostRecentPrice' label='Current Price' addLabel/>
          <NumberField source='mostRecentBidCount' label='Current Bid Count'/>
          <DateField showTime source="mostRecentUpdate" />
          <DateField showTime source="nextCheckTimestamp" />

          <TextField source="listingName" />
          <UrlField source='listingUrl' />
          <TextField source='listingId' />
          <TextField source='listingMessage' />
          <BareArrayField source='listingEndTime' label='Listing End Time' addLabel />
          <BareArrayField source='listingTypes' label='Listing Types' addLabel />
          <BareArrayField source='imageUrls' label='Image Urls' addLabel />

          <DateField showTime source="dateCreated" />
          <DateField showTime source="dateLastModified" />

          <ReferenceArrayField label='Search Ids' reference={DOMAIN.EBAY_SEARCH_PARAMS} source="searchIds">
            <SingleFieldList linkType='show' >
              <ChipField
                source='id'
                colour='primary'
                afterIconMapper={(record) => record.active ? <Done /> : undefined}
                style={{ margin: 5 }}
              />
            </SingleFieldList>
          </ReferenceArrayField>
          <TextField source='unknownDetails' />
        </Tab>
        <Tab label='History'>
          <ArrayField source='history' >
            <Datagrid>
              <DateField showTime source="timestamp" />
              <CurrencyAmountField source='price' label='Price'/>
              <NumberField source='bidCount' label='Bid Count'/>
              <TextField source='searchId' label='Search Id'/>
              <UrlField source='searchUrl' label='Search Url'/>
            </Datagrid>
          </ArrayField>
        </Tab>
        <Tab label='Buying Opportunity'>
          <NumberField source='buyingOpportunity.score' label='Score'/>
          <CurrencyAmountField source='buyingOpportunity.differenceToMin' label='Difference to Min' addLabel/>
          <CurrencyAmountField source='buyingOpportunity.differenceToMedian' label='Difference to Median' addLabel/>
          <CurrencyAmountField source='buyingOpportunity.differenceToMean' label='Difference to Mean' addLabel/>
          <CurrencyAmountField source='buyingOpportunity.differenceToMax' label='Difference to Max' addLabel/>
          <NumberField source='buyingOpportunity.sellingVolume' label='Selling Volume'/>
          <BooleanField source='buyingOpportunity.canBuyNow' label='Can Buy Now'/>
          <DateField showTime source="buyingOpportunity.listingEnds" />
        </Tab>
        <Tab label='Links'>
          <SubmitButton
            label='Archive Listing'
            icon={<Archive />}
            onPress={() => {
              if (!record) {
                throw new Error('No record')
              }
              return adminClient.archiveListing(`${record.id}`)
            }}
          />
        </Tab>
      </TabbedShowLayout>
    </Show>
  )
}