import {
  DateField, ImageField,
  NumberField,
  ReferenceField,
  Show,
  ShowProps,
  Tab,
  TabbedShowLayout,
  TextField,
  UrlField,
  useShowController
} from "react-admin";
import {DOMAIN} from "../Domains";
import React from "react";
import {JsonField} from "react-admin-json-view";
import {BareArrayField} from "../../components/BareArrayField";
import {GoToListField} from "../../components/GoToListField";


export const UserShow = (props:ShowProps) => {
  const {record} = useShowController(props);
  return (
    <Show {...props}>
      <TabbedShowLayout>
        <Tab label='Details'>
          <TextField source="id" />
          <BareArrayField source="membership.plans" />
          <DateField showTime source="dateCreated" />
          <ReferenceField label='parent user id' reference={DOMAIN.USER} source='parentUserId' link='show'>
            <TextField source="id" />
          </ReferenceField>
          <ReferenceField label='most recent session id' reference={DOMAIN.USER_SESSION} source='mostRecentSessionId' link='show'>
            <TextField source="id" />
          </ReferenceField>
          <DateField showTime source="dateLastModified" />
          <TextField source="details.displayName" />
          <TextField source="details.email" />
          <ImageField source="details.photoUrl" />
          <TextField source="facebookUserId" />
          <BareArrayField source="firebaseUserIds" />
          <TextField source="preferredCurrency" />
          <TextField source="stripeDetails.stripeId" />
          <UrlField source="stripeDetails.stripeLink" />
        </Tab>
        <Tab label='Links'>
          <a style={{margin: 8}} href={`/#/${DOMAIN.USER_SESSION}?filter=%7B"userId"%3A"${record?.id}"%2C"sortField"%3A"dateCreated"%2C"sortDirection"%3A"DESC"%7D`}>Go to user sessions</a>
          <a style={{margin: 8}} href={`/#/${DOMAIN.USER_EVENT}?filter=%7B"userId"%3A"${record?.id}"%2C"sortField"%3A"timestamp"%2C"sortDirection"%3A"DESC"%7D`}>Go to user events</a>
        </Tab>
      </TabbedShowLayout>
    </Show>
  )
}