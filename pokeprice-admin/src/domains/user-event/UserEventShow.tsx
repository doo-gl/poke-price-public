import {
  DateField,
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


export const UserEventShow = (props:ShowProps) => {
  const {record} = useShowController(props);
  return (
    <Show {...props}>
      <TabbedShowLayout>
        <Tab label='Details'>
          <TextField source="id" />
          <ReferenceField source="userId" reference={DOMAIN.USER} link='show'>
            <TextField source="id" />
          </ReferenceField>
          <ReferenceField source="sessionId" reference={DOMAIN.USER_SESSION} link='show'>
            <TextField source="id" />
          </ReferenceField>
          <DateField showTime source="timestamp" />
          <TextField source="eventName" />
          <JsonField source="eventDetails" addLabel />
          <UrlField source="path" />
          <DateField showTime source="dateCreated" />
          <DateField showTime source="dateLastModified" />
        </Tab>
      </TabbedShowLayout>
    </Show>
  )
}