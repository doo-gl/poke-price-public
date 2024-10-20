import {BooleanField, DateField, ReferenceField, Show, ShowProps, Tab, TabbedShowLayout, TextField} from "react-admin";
import {DOMAIN} from "../Domains";
import React from "react";
import {BareArrayField} from "../../components/BareArrayField";
import {GoToListField} from "../../components/GoToListField";


export const CardPriceSelectionShow = (props:ShowProps) => {

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
          <ReferenceField source="searchId" label='Ebay Search Param' reference={DOMAIN.EBAY_SEARCH_PARAMS} link='show'>
            <TextField source="id" />
          </ReferenceField>
          <BareArrayField source="searchParams.includeKeywords" addLabel />
          <BareArrayField source="searchParams.excludeKeywords" addLabel />
          <BooleanField source="hasReconciled" />
        </Tab>
        <Tab label='Links'>
          <GoToListField source='id' queryField='selectionIds' label='Go to Solds' domain={DOMAIN.HISTORICAL_CARD_PRICE} />
          <GoToListField source='id' queryField='selectionIds' label='Go to Listings' domain={DOMAIN.EBAY_OPEN_LISTING} />
          <GoToListField source='id' queryField='selectionId' label='Go to Stats' domain={DOMAIN.CARD_STATS_V2} />
        </Tab>
      </TabbedShowLayout>
    </Show>
  )
}