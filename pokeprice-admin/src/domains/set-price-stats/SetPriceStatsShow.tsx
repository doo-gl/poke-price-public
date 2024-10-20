import {DateField, ReferenceField, Show, ShowProps, SimpleShowLayout, TextField} from "react-admin";
import {DOMAIN} from "../Domains";
import React from "react";
import {CurrencyAmountField} from "../../components/CurrencyAmountField";


export const SetPriceStatsShow = (props:ShowProps) => {

  return (
    <Show {...props}>
      <SimpleShowLayout>
        <TextField source="id" />
        <DateField showTime source="dateCreated" />
        <DateField showTime source="dateLastModified" />
        <TextField source="series" />
        <TextField source="set" />
        <ReferenceField source="setId" reference={DOMAIN.SET} link='show'>
          <TextField source="id" />
        </ReferenceField>
        <ReferenceField source="setId" reference={DOMAIN.SET} link='show'>
          <TextField source="set" />
        </ReferenceField>
        <DateField showTime source="lastCalculationTime" />
        <DateField showTime source="mostRecentPrice" />
        <CurrencyAmountField source="totalSetPokePrice" />
      </SimpleShowLayout>
    </Show>
  )
}