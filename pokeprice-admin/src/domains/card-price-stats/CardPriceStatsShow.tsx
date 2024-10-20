import {
  DateField,
  FunctionField,
  NumberField,
  ReferenceArrayField,
  ReferenceField,
  Show,
  ShowProps,
  SingleFieldList,
  Tab,
  TabbedShowLayout,
  TextField,
  UrlField
} from "react-admin";
import {DOMAIN} from "../Domains";
import React from "react";
import {CurrencyAmountField} from "../../components/CurrencyAmountField";


export const CardPriceStatsShow = (props:ShowProps) => {

  return (
    <Show {...props}>
      <TabbedShowLayout>
        <Tab label='Details'>
          <TextField source="id" />
          <DateField showTime source="dateCreated" />
          <DateField showTime source="dateLastModified" />
          <TextField source="series" />
          <TextField source="set" />
          <TextField source="numberInSet" />
          <ReferenceField source="cardId" reference={DOMAIN.ITEM} link='show'>
            <TextField source="id" />
          </ReferenceField>
          <ReferenceField source="cardId" reference={DOMAIN.ITEM} link='show'>
            <FunctionField render={(record:any) => `${record.set}|${record.name}`} />
          </ReferenceField>
          <UrlField source="searchUrl" />
          <ReferenceField source="searchId" reference={DOMAIN.EBAY_SEARCH_PARAMS} link='show'>
            <TextField source="id" />
          </ReferenceField>
          <DateField showTime source="lastCalculationTime" />
          <DateField showTime source="mostRecentPrice" />
        </Tab>
        <Tab label='Poke Price'>
          <CurrencyAmountField source='shortViewStats.min' label='mean' addLabel/>
          <CurrencyAmountField source='shortViewStats.mean' label='mean' addLabel/>
          <CurrencyAmountField source='shortViewStats.median' label='median' addLabel/>
          <CurrencyAmountField source='shortViewStats.max' label='max' addLabel/>
          <CurrencyAmountField source='shortViewStats.standardDeviation' label='Standard Deviation' addLabel/>
          <NumberField source='shortViewStats.count' label='Count'/>
          <ReferenceArrayField label="Prices" reference={DOMAIN.HISTORICAL_CARD_PRICE} source="shortViewStats.cardPriceIds">
            <SingleFieldList linkType='show' >
              <CurrencyAmountField component='chip' source="currencyAmount" style={{margin: 5}}/>
            </SingleFieldList>
          </ReferenceArrayField>
        </Tab>
        <Tab label='Long Sold View'>
          <CurrencyAmountField source='longViewStats.min' label='Min' addLabel/>
          <CurrencyAmountField source='longViewStats.mean' label='Mean' addLabel/>
          <CurrencyAmountField source='longViewStats.median' label='Median' addLabel/>
          <CurrencyAmountField source='longViewStats.max' label='Max' addLabel/>
          <CurrencyAmountField source='longViewStats.standardDeviation' label='Standard Deviation' addLabel/>
          <NumberField source='longViewStats.count' label='Count'/>
          <ReferenceArrayField label="Prices" reference={DOMAIN.HISTORICAL_CARD_PRICE} source="longViewStats.cardPriceIds">
            <SingleFieldList linkType='show' >
              <CurrencyAmountField component='chip' source="currencyAmount" style={{margin: 5}}/>
            </SingleFieldList>
          </ReferenceArrayField>
        </Tab>
      </TabbedShowLayout>
    </Show>
  )
}