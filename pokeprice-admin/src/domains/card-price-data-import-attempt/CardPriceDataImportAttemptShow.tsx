import {
  ArrayField,
  Datagrid,
  DateField,
  List,
  ListProps, ReferenceField,
  Show,
  ShowProps,
  SimpleShowLayout,
  TextField
} from "react-admin";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import React from "react";


export const CardPriceDataImportAttemptShow = (props:ShowProps) => {

  return (
    <Show {...props}>
      <SimpleShowLayout>
        <TextField source="id" />
        <DateField showTime source="dateCreated" />
        <DateField showTime source="dateLastModified" />
        <DateField showTime source="dateStateStarted" />
        <TextField source="state" />
        <TextField source="subState" />
        <ArrayField source="history">
          <Datagrid>
            <DateField showTime source="dateStateStarted" />
            <TextField source="state" />
            <TextField source="subState" />
            <TextField source="detail" />
          </Datagrid>
        </ArrayField>
        <TextField source="importType" />
        <TextField source="importData" />
        <ReferenceField label='Card' source="importData.cardId" reference={DOMAIN.ITEM} link='show'>
          <TextField source="id" />
        </ReferenceField>
        <ReferenceField label='Set' source="importData.setId" reference={DOMAIN.SET} link='show'>
          <TextField source="id" />
        </ReferenceField>
        <ReferenceField source="parentImportId" reference={DOMAIN.CARD_PRICE_DATA_IMPORT_ATTEMPT} link='show'>
          <TextField source="id" />
        </ReferenceField>
      </SimpleShowLayout>
    </Show>
  )
}