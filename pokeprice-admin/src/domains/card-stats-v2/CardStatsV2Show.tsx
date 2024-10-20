import {
  ArrayField,
  Datagrid,
  DateField, FunctionField,
  NumberField,
  ReferenceArrayField,
  ReferenceField,
  Show,
  ShowProps,
  SingleFieldList,
  Tab,
  TabbedShowLayout,
  TextField, UrlField,
  useShowController
} from "react-admin";
import {DOMAIN} from "../Domains";
import React from "react";
import {CurrencyAmountField} from "../../components/CurrencyAmountField";


export const CardStatsV2Show = (props:ShowProps) => {
  const {record} = useShowController(props);
  return (
    <Show {...props}>
      <TabbedShowLayout>
        <Tab label='Details'>
          <TextField source="id" />
          <DateField source="dateCreated" showTime/>
          <DateField source="dateLastModified" showTime/>
          <ReferenceField source="cardId" reference={DOMAIN.ITEM} link='show'>
            <TextField source="name" />
          </ReferenceField>
          <TextField source="priceType" />
          <TextField source="currencyCode" />
          <TextField source="condition" />
          <NumberField source="periodSizeDays" />
          <ReferenceField source="selectionId" label='Card Selection' reference={DOMAIN.CARD_SELECTION} link='show'>
            <TextField source="id" />
          </ReferenceField>
          <DateField source="from" showTime/>
          <DateField source="to" showTime/>
          <DateField source="lastCalculatedAt" showTime/>
          <DateField source="nextCalculationTime" showTime/>
        </Tab>
        <Tab label='Stats'>
          <NumberField source="stats.count" />
          <CurrencyAmountField addLabel label="Min" source="stats.min" />
          <CurrencyAmountField addLabel label="Mean" source="stats.mean" />
          <CurrencyAmountField addLabel label="Median" source="stats.median" />
          <CurrencyAmountField addLabel label="Max" source="stats.max" />
          <CurrencyAmountField addLabel label="Standard Deviation" source="stats.standardDeviation" />
          <CurrencyAmountField addLabel label="Moving Avg. 5" source="stats.movingAverageFive" />
          <CurrencyAmountField addLabel label="Moving Avg. 10" source="stats.movingAverageTen" />
          <CurrencyAmountField addLabel label="Moving Avg. 20" source="stats.movingAverageTwenty" />
          <ReferenceArrayField
            label="Prices"
            reference={record?.priceType === 'SOLD_PRICE' ? DOMAIN.HISTORICAL_CARD_PRICE : DOMAIN.EBAY_OPEN_LISTING}
            source="itemIds"
          >
            <SingleFieldList linkType='show' >
              <CurrencyAmountField
                component='chip'
                source={record?.priceType === 'SOLD_PRICE' ? 'currencyAmount' : 'mostRecentPrice'}
                style={{margin: 5}}
              />
            </SingleFieldList>
          </ReferenceArrayField>
          <ReferenceArrayField
            label="Prices"
            reference={record?.priceType === 'SOLD_PRICE' ? DOMAIN.HISTORICAL_CARD_PRICE : DOMAIN.EBAY_OPEN_LISTING}
            source="itemIds"
          >
            {
              record?.priceType === 'SOLD_PRICE'
                ? (
                  <Datagrid >
                    <TextField source="sourceDetails.listingName" label="Listing Name"/>
                    <UrlField source="sourceDetails.listingUrl" label="Listing Url" />
                    <NumberField source="currencyAmount.amountInMinorUnits" label="Currency Amount" />
                    <TextField source="currencyAmount.currencyCode" label="Currency Amount" />
                    <CurrencyAmountField source="currencyAmount" label='Price' addLabel />
                  </Datagrid>
                )
                : (
                  <Datagrid >
                    <TextField source="listingName" />
                    <UrlField source='listingUrl' />
                    <NumberField source="mostRecentPrice.amountInMinorUnits" label="Currency Amount" />
                    <TextField source="mostRecentPrice.currencyCode" label="Currency Amount" />
                    <CurrencyAmountField source='mostRecentPrice' label='Current Price' addLabel/>
                  </Datagrid>
                )
            }

          </ReferenceArrayField>
        </Tab>
      </TabbedShowLayout>
    </Show>
  )
}