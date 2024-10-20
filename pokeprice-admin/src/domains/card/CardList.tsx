import {
  BooleanField,
  CreateButton,
  Datagrid,
  List,
  ListProps,
  NumberField,
  ReferenceField,
  TextField,
  TopToolbar
} from "react-admin";
import React from "react";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import {CurrencyAmountField} from "../../components/CurrencyAmountField";
import {Button} from "@material-ui/core";
import {Link} from "react-router-dom";


const ListActions = (props:any) => (
  <TopToolbar>
    <Button
      component={Link}
      to={{
        pathname: `/card/csv`,
      }}
    >
      Csv
    </Button>
  </TopToolbar>
);

export const CardList = (props:ListProps) => {
  return (
    <React.Fragment>
      <CreateButton component={Link} to={{pathname: `/${DOMAIN.CARD}/create`,}}/>
      <List
        {...props}
        pagination={<Pagination withPages/>}
        filters={<Filter domain={DOMAIN.CARD} />}
      >
        <Datagrid rowClick='show' >
          <ReferenceField label='ID' reference='card' source='id' link='show'>
            <TextField source="id" />
          </ReferenceField>
          <ReferenceField label='Set' reference='set' source='setId' link='show'>
            <TextField source="set" />
          </ReferenceField>
          <TextField source="displayName" />
          <TextField source="variant" />
          <BooleanField source="visible" />
          <CurrencyAmountField source='pokePriceV2.soldPrice' label='Sold Price' />
          <NumberField source='pokePriceV2.soldVolume' label='Sold Volume' />
          <CurrencyAmountField source='pokePriceV2.listingPrice' label='Listing Price' />
          <NumberField source='pokePriceV2.listingVolume' label='Listing Volume' />
        </Datagrid>
      </List>
    </React.Fragment>
  )
}