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


export const UserSessionShow = (props:ShowProps) => {
  const {record} = useShowController(props);
  return (
    <Show {...props}>
      <TabbedShowLayout>
        <Tab label='Details'>
          <TextField source="id" />
          <ReferenceField source="userId" reference={DOMAIN.USER} link='show'>
            <TextField source="id" />
          </ReferenceField>
          <DateField showTime source="dateCreated" />
          <DateField showTime source="dateLastModified" />
          <DateField showTime source="mostRecentBeaconReceived" />
          <NumberField source="numberOfBeaconsReceived" />
          <NumberField source="sessionLengthInSeconds" />
          <NumberField source="numberOfPaths" />
          <TextField source="ipAddress" />
          <TextField source="userAgent" />
          <UrlField source="origin" />
          <UrlField source="referrer" />
          <UrlField source="startPath" />
          <JsonField source="utm" addLabel />
        </Tab>
        <Tab label='Paths'>
          <div>
            <h3>Paths</h3>
            <ul>
              {record?.paths?.map((path:string) =>
                <li key={path}>
                  <a href={path}>{path}</a>
                </li>
              )}
            </ul>

          </div>
        </Tab>
        <Tab label='Links'>
          <a style={{margin: 8}} href={`/#/${DOMAIN.USER_EVENT}?filter=%7B"sessionId"%3A"${record?.id}"%2C"sortField"%3A"timestamp"%2C"sortDirection"%3A"DESC"%7D`}>Go to user events</a>
        </Tab>
      </TabbedShowLayout>
    </Show>
  )
}