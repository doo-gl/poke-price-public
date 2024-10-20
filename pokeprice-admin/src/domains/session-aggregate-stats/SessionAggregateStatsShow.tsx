import {
  ArrayField,
  Datagrid,
  DateField,
  NumberField,
  ReferenceField,
  Show,
  ShowProps,
  Tab,
  TabbedShowLayout,
  TextField,
  useShowController
} from "react-admin";
import {DOMAIN} from "../Domains";
import React from "react";


export const SessionAggregateStatsShow = (props:ShowProps) => {
  const {record} = useShowController(props);
  return (
    <Show {...props}>
      <TabbedShowLayout>
        <Tab label='Details'>
          <TextField source="groupingKey" />
          <DateField showTime source="lastCalculated" />
          <NumberField source="stats.newUsers" label="New Users" />
          <NumberField source="stats.returningUsers" label="Returning Users" />
          <NumberField source="stats.engagedSessions" label="Engaged Sessions" />
          <NumberField source="stats.nonEngagedSessions" label="Non-Engaged Sessions" />
          <NumberField source="stats.bouncedSessions" label="Bounces" />
          <NumberField source="stats.uniqueUsers" label="Unique users" />
          <NumberField source="stats.uniqueSessions" label="Unique Sessions" />
          <NumberField source="stats.pageViews" label="Page Views" />
          <NumberField source="stats.registrations" label="Registrations" />
          <NumberField source="stats.ebayRedirects" label="Ebay Redirects" />
          <NumberField source="stats.subscriptions" label="Subscriptions" />
          <NumberField source="stats.minSessionLengthSecs" label="Min. Session Length (s)" />
          <NumberField source="stats.avgSessionLengthSecs" label="Avg. Session Length (s)" />
          <NumberField source="stats.maxSessionLengthSecs" label="Max. Session Length (s)" />
          <NumberField source="stats.stdDevSessionLengthSecs" label="StdDev. Session Length (s)" />
        </Tab>
        <Tab label="Sessions">
          <ArrayField  source="sessions" >
            <Datagrid>
              <ReferenceField source="sessionId" reference={DOMAIN.USER_SESSION} link='show'>
                <TextField source="id" />
              </ReferenceField>
              <ReferenceField source="userId" reference={DOMAIN.USER} link='show'>
                <TextField source="id" />
              </ReferenceField>
              <DateField showTime source="lastCalculated" />
              <TextField source="userType" />
              <TextField source="sessionType" />
              <NumberField source="pageViews" />
              <NumberField source="registrations" />
              <NumberField source="ebayRedirects" />
              <NumberField source="subscriptions" />
              <NumberField source="sessionLengthSecs" />
            </Datagrid>
          </ArrayField>
        </Tab>
      </TabbedShowLayout>
    </Show>
  )
}