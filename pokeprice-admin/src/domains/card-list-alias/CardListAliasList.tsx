import {CreateButton, Datagrid, List, ListProps, ReferenceField, TextField} from "react-admin";
import React from "react";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import {Link} from "react-router-dom";


export const CardListAliasList = (props:ListProps) => {
  return (
    <React.Fragment>
      <CreateButton component={Link} to={{pathname: `/${DOMAIN.CARD_LIST_ALIAS}/create`,}}/>
      <List
        {...props}
        pagination={<Pagination/>}
        filters={<Filter domain={DOMAIN.CARD_LIST_ALIAS} />}
      >
        <Datagrid rowClick="show">
          <ReferenceField label='ID' reference='card-list-alias' source='id' link='show'>
            <TextField source="id" />
          </ReferenceField>
          <TextField source="aliasSlug" />
          <TextField source="canonicalSlug" />
        </Datagrid>
      </List>
    </React.Fragment>
  )
}