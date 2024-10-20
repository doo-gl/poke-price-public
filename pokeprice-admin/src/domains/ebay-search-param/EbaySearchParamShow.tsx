import {
  BooleanField,
  Button,
  CreateButton,
  DateField, EditButton,
  FunctionField,
  ReferenceField,
  Show,
  ShowProps,
  Tab,
  TabbedShowLayout,
  TextField,
  TopToolbar,
  UrlField, useShowController
} from "react-admin";
import {DOMAIN} from "../Domains";
import React from "react";
import {Link} from "react-router-dom";
import {BareArrayField} from "../../components/BareArrayField";
import {GoToListField} from "../../components/GoToListField";
import {SubmitButton} from "../../components/SubmitButton";
import {Refresh} from "@material-ui/icons";
import {adminClient} from "../../infrastructure/AdminClient";

interface ActionProps {
  record:any,
}
const Actions = (props:ActionProps) => {
  if (!props.record) {
    return null;
  }
  return (
    <TopToolbar>
      <Button
        component={Link}
        to={{
          pathname: `/${DOMAIN.EBAY_SEARCH_PARAMS}/create`,
          state: {record: {
              cardId: props.record.cardId,
              includeKeywords: props.record.includeKeywords,
              excludeKeywords: props.record.excludeKeywords,
            }},
        }}
        label='Create'
      />
    </TopToolbar>
  )
}

export const EbaySearchParamsShow = (props:ShowProps) => {
  const {record} = useShowController(props);
  return (
    <Show {...props} actions={<Actions record={record}/>}>
      <TabbedShowLayout>
        <Tab label='Details'>
          <TextField source="id" />
          <BareArrayField source="includeKeywords" addLabel />
          <BareArrayField source="excludeKeywords" addLabel />
          <ReferenceField source="cardId" reference={DOMAIN.ITEM} link='show'>
            <TextField source="id" />
          </ReferenceField>
          <DateField showTime source="lastReconciled" />
          <DateField showTime source="dateCreated" />
          <DateField showTime source="dateLastModified" />
          <TextField source="series" />
          <TextField source="set" />
          <TextField source="numberInSet" />
          <ReferenceField source="cardId" reference={DOMAIN.ITEM} link='show'>
            <FunctionField render={(record:any) => `${record.set}|${record.name}`} />
          </ReferenceField>
          <UrlField source="searchUrl" />
          <BooleanField source="active" />
        </Tab>
        <Tab label='Links'>
          <GoToListField source='id' queryField='searchIds' label='Go to Sold Listings' domain={DOMAIN.HISTORICAL_CARD_PRICE} />
          <GoToListField source='id' queryField='searchIds' label='Go to Open Listings' domain={DOMAIN.EBAY_OPEN_LISTING} />

          <SubmitButton
            label='Reconcile listings for search param'
            icon={<Refresh />}
            onPress={() => {
              if (!record) {
                throw new Error('No record')
              }
              return adminClient.reconcileListings(`${record.id}`)
            }}
          />
        </Tab>
      </TabbedShowLayout>
    </Show>
  )
}