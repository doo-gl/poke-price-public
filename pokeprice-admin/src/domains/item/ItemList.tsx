import {
  BooleanField,
  CreateButton,
  Datagrid, DateField,
  List,
  ListProps,
  ReferenceField,
  TextField,
  TopToolbar
} from "react-admin";
import React from "react";
import {Pagination} from "../../components/Pagination";
import {Filter} from "../../components/Filter";
import {DOMAIN} from "../Domains";
import {Button} from "@material-ui/core";
import {Link} from "react-router-dom";
import {CurrencyCode} from "../../common/CurrencyCode";
import {ItemNameField} from "../../components/ItemNameField";
import {ItemPriceDetailsField} from "../../components/ItemPriceDetailsField";
import {PriceType} from "../../common/ItemPriceQuerier";


const ListActions = (props:any) => (
  <TopToolbar>
    <Button
      component={Link}
      to={{
        pathname: `/item/csv`,
      }}
    >
      Csv
    </Button>
  </TopToolbar>
);

export const ItemList = (props:ListProps) => {

  return (
    <React.Fragment>
      <CreateButton component={Link} to={{pathname: `/${DOMAIN.ITEM}/create/bulk`,}}/>
      <List
        {...props}
        pagination={<Pagination withPages/>}
        filters={<Filter domain={DOMAIN.ITEM} />}
      >
        <Datagrid rowClick='show' >
          <ReferenceField label='ID' reference={DOMAIN.ITEM} source='id' link='show'>
            <TextField source="id" />
          </ReferenceField>
          <ItemNameField label="Name" />
          <DateField source='dateCreated' showTime options={{timeZone: 'UTC', timeZoneName: 'short'}} />
          <BooleanField source="visible" />
          <ItemPriceDetailsField priceType={PriceType.SALE} currencyCode={CurrencyCode.GBP} label='Sold' />
          <ItemPriceDetailsField priceType={PriceType.LISTING} currencyCode={CurrencyCode.GBP} label='Listing' />
          {/*<ItemPriceField priceType="sold" currency={CurrencyCode.GBP} label='Sold Price' />*/}
          {/*<ItemVolumeField priceType="sold" currency={CurrencyCode.GBP} label='Sold Volume' />*/}
          {/*<ItemPriceField priceType="listing" currency={CurrencyCode.GBP} label='Listing Price' />*/}
          {/*<ItemVolumeField priceType="listing" currency={CurrencyCode.GBP} label='Listing Volume' />*/}
        </Datagrid>
      </List>
    </React.Fragment>
  )
}