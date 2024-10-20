import {Datagrid, DateField, FunctionField, List, ListProps, NumberField, TextField} from "react-admin";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import React from "react";


export const SessionAggregateStatsList = (props:ListProps) => {
  return (
    <List
      {...props}
      pagination={<Pagination/>}
      filters={<Filter domain={DOMAIN.SESSION_AGGREGATE_STATS} />}
      sort={{field: 'lastCalculated', order: "DESC"}}
    >
      <Datagrid rowClick='show' >
        <TextField source="groupingKey" />
        <DateField showTime source="lastCalculated" />

        <NumberField source="stats.uniqueSessions" label="Unique Sessions" />
        <NumberField source="stats.uniqueUsers" label="Unique Users" />
        <NumberField source="stats.pageViews" label="Page Views" />
        <NumberField source="stats.registrations" label="Registrations" />
        <FunctionField label="Registrations / Session" render={(record:any) => `${Math.round(((record.stats.registrations / record.stats.uniqueSessions) * 1000)) / 1000}`} />
        <FunctionField label="Bounce / Session" render={(record:any) => `${Math.round(((record.stats.bouncedSessions / record.stats.uniqueSessions) * 1000)) / 1000}`} />
      </Datagrid>
    </List>
  )
}