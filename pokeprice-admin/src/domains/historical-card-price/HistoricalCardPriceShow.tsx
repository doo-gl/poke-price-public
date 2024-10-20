import {
  DateField,
  FunctionField,
  ReferenceArrayField,
  ReferenceField,
  Show,
  ShowProps,
  SingleFieldList,
  Tab,
  TabbedShowLayout,
  TextField,
  useShowController
} from "react-admin";
import React from "react";
import {CurrencyAmountField} from "../../components/CurrencyAmountField";
import {DOMAIN} from "../Domains";
import {ChipField} from "../../components/ChipField";
import {Block, Done, Refresh} from "@material-ui/icons";
import {SubmitButton} from "../../components/SubmitButton";
import {adminClient} from "../../infrastructure/AdminClient";


export const HistoricalCardPriceShow = (props:ShowProps) => {
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
          <ReferenceField source="sourceDetails.openListingId" label='Open Listing' reference={DOMAIN.EBAY_OPEN_LISTING} link='show'>
            <TextField source="id" />
          </ReferenceField>
          <DateField source="timestamp" showTime/>
          <CurrencyAmountField source="currencyAmount" label='Price' addLabel />
          <TextField source="priceDataType" />
          <TextField source="sourceType" />
          <TextField source="state" />
          <TextField label='Source Id' source="sourceId" />
          <FunctionField label='Source Details' render={(record:any) => JSON.stringify(record.sourceDetails, null, 2)} />
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
        </Tab>
        <Tab label='Links'>
          <SubmitButton
            label='Activate'
            icon={<Done />}
            onPress={() => {
              if (!record) {
                throw new Error('No record')
              }
              return adminClient.activatePrice(`${record.id}`)
            }}
          />
          <SubmitButton
            label='Deactivate'
            icon={<Block />}
            onPress={() => {
              if (!record) {
                throw new Error('No record')
              }
              return adminClient.deactivatePrice(`${record.id}`)
            }}
          />
        </Tab>
      </TabbedShowLayout>
    </Show>
  )
}