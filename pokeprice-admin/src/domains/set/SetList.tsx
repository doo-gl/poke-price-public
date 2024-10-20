import {CreateButton, Datagrid, List, ListProps, TextField} from "react-admin";
import React from "react";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import {Link} from "react-router-dom";


export const SetList = (props:ListProps) => {
  return (
    <React.Fragment>
      <CreateButton component={Link} to={{pathname: `/${DOMAIN.SET}/create`,}}/>
      <List
        {...props}
        pagination={<Pagination/>}
        filters={<Filter domain={DOMAIN.SET} />}
      >
        <Datagrid rowClick="show">
          <TextField source="id" />
          <TextField source="set" />
          <TextField source="series" />
        </Datagrid>
      </List>
    </React.Fragment>

  )
}