import {Datagrid, DateField, List, ListProps, NumberField, ReferenceField, TextField} from "react-admin";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import React from "react";
import ReactJson from 'react-json-view'

const ExpandEventView = (props:any) => {
  const record = props.record
  return (
    <div>
      Details
      <div>
        <ReactJson src={record.eventDetails} />
      </div>
      Path
      <div>
        <a href={record.path} >{record.path}</a>
      </div>
    </div>
  )
}

export const UserEventList = (props:ListProps) => {
  return (
    <List
      {...props}
      pagination={<Pagination/>}
      filters={<Filter domain={DOMAIN.USER_EVENT} />}
      sort={{field: 'timestamp', order: "DESC"}}
    >
      <Datagrid rowClick='show' expand={<ExpandEventView/>} >
        <ReferenceField label='ID' reference={DOMAIN.USER_EVENT} source='_id' link='show'>
          <TextField source="id" />
        </ReferenceField>
        <DateField showTime source="timestamp" label="Timestamp" />
        <TextField source="eventName" />
        <ReferenceField label='User ID' reference={DOMAIN.USER} source='userId' link='show'>
          <TextField source="id" />
        </ReferenceField>
        <ReferenceField label='Session ID' reference={DOMAIN.USER_SESSION} source='sessionId' link='show'>
          <TextField source="id" />
        </ReferenceField>

      </Datagrid>
    </List>
  )
}