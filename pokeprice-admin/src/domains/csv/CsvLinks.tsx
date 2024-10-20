import {Button, Card, CardActions, CardContent} from "@material-ui/core";
import {Title} from "react-admin";
import * as React from "react";
import {adminClient} from "../../infrastructure/AdminClient";
import { saveAs } from 'file-saver';
import moment from "moment";
import {SubmitButton} from "../../components/SubmitButton";


export const CsvLinks = (props:any) => {


  return (
    <Card>
      <Title title="Csv Links" />
      <CardContent>
        <CardActions style={{
          flexDirection: 'row',
          justifyContent: 'space-around'
        }}>
          <SubmitButton
            label="Card Search Param Csv"
            onPress={async () => {
              const csv = await adminClient.getCardSearchParamsCsv()
              const now = moment().format('YYYY_MM_DD_HH_mm')
              saveAs(
                new Blob([csv], {type: "text/csv;charset=utf-8"}),
                `card_search_params_${now}.csv`
              )
            }}
          />
          <SubmitButton
            label="Top Buying Opportunity Csv"
            onPress={async () => {
              const csv = await adminClient.getTopBuyingOpportunityCsv()
              const now = moment().format('YYYY_MM_DD_HH_mm')
              saveAs(
                new Blob([csv], {type: "text/csv;charset=utf-8"}),
                `top_buying_opportunities_${now}.csv`
              )
            }}
          />
          <SubmitButton
            label="Listings Ending Soon Csv"
            onPress={async () => {
              const csv = await adminClient.getListingsEndingSoonCsv()
              const now = moment().format('YYYY_MM_DD_HH_mm')
              saveAs(
                new Blob([csv], {type: "text/csv;charset=utf-8"}),
                `listings_ending_soon_${now}.csv`
              )
            }}
          />
          <SubmitButton
            label="Sealed Items"
            onPress={async () => {
              const csv = await adminClient.getSealedItemsCsv()
              const now = moment().format('YYYY_MM_DD_HH_mm')
              saveAs(
                new Blob([csv], {type: "text/csv;charset=utf-8"}),
                `sealed_items__${now}.csv`
              )
            }}
          />
        </CardActions>

      </CardContent>

    </Card>
  );
}