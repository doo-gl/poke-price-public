import * as React from "react";
import {Route} from 'react-router-dom';
import {CsvLinks} from "../domains/csv/CsvLinks";
import {SetCreate} from "../domains/set/SetCreate";
import {EbayListHtmlSubmit} from "../domains/item/EbayListHtmlSubmit";
import {ItemKeywordUpdate} from "../domains/item/ItemKeywordUpdate";
import {ItemImageUpdate} from "../domains/item/ItemImageUpdate";
import {ItemVisibilityUpdate} from "../domains/item/ItemVisibilityUpdate";
import {ItemCreate} from "../domains/item/ItemCreate";
import {ItemCsvCreate} from "../domains/item/ItemCsvCreate";


export const customRoutes = [
  <Route exact path="/item/:id/update-keywords" component={ItemKeywordUpdate} />,
  <Route exact path="/item/:id/update-image" component={ItemImageUpdate} />,
  <Route exact path="/item/:id/submit-list-html" component={EbayListHtmlSubmit} />,
  <Route exact path="/item/:id/update-visibility" component={ItemVisibilityUpdate} />,
  <Route exact path="/item/create" component={ItemCreate} />,
  <Route exact path="/item/create/bulk" component={ItemCsvCreate} />,
  <Route exact path="/set/create" component={SetCreate} />,
  <Route exact path="/csv-links" component={CsvLinks} />,
];