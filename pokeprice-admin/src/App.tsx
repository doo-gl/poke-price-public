import React from 'react';
import {Admin, Resource} from "react-admin";
import {adminDataProvider} from "./infrastructure/AdminDataProvider";
import {SetList} from "./domains/set/SetList";
import {configRetriever} from "./infrastructure/ConfigRetriever";
import {HistoricalCardPriceList} from "./domains/historical-card-price/HistoricalCardPriceList";
import {HistoricalCardPriceShow} from "./domains/historical-card-price/HistoricalCardPriceShow";
import {DOMAIN} from "./domains/Domains";
import {SetShow} from "./domains/set/SetShow";
import {CacheEntryList} from "./domains/cache-entry/CacheEntryList";
import {CacheEntryShow} from "./domains/cache-entry/CacheEntryShow";
import {CardPriceDataImportAttemptList} from "./domains/card-price-data-import-attempt/CardPriceDataImportAttemptList";
import {CardPriceDataImportAttemptShow} from "./domains/card-price-data-import-attempt/CardPriceDataImportAttemptShow";
import {CardPriceStatsList} from "./domains/card-price-stats/CardPriceStatsList";
import {CardPriceStatsShow} from "./domains/card-price-stats/CardPriceStatsShow";
import {SetPriceStatsList} from "./domains/set-price-stats/SetPriceStatsList";
import {SetPriceStatsShow} from "./domains/set-price-stats/SetPriceStatsShow";
import {MigrationList} from "./domains/migration/MigrationList";
import {MigrationShow} from "./domains/migration/MigrationShow";
import {EbaySearchParamList} from "./domains/ebay-search-param/EbaySearchParamList";
import {EbaySearchParamsShow} from "./domains/ebay-search-param/EbaySearchParamShow";
import {NewsList} from "./domains/news/NewsList";
import {NewsShow} from "./domains/news/NewsShow";
import {firebaseApp} from "./infrastructure/FirebaseApp";
import {firebaseAuthProvider} from "./infrastructure/FirebaseAuthProvider";
import {EbaySearchParamCreate} from "./domains/ebay-search-param/EbaySearchParamCreate";
import {EbayOpenListingList} from "./domains/ebay-open-listing/EbayOpenListingList";
import {EbayOpenListingShow} from "./domains/ebay-open-listing/EbayOpenListingShow";
import {
  Announcement,
  Assessment,
  AssessmentOutlined,
  Assignment,
  Cached,
  Image,
  ImportExport,
  Link,
  MonetizationOn,
  MonetizationOnOutlined,
  Person,
  PhotoLibrary,
  Search,
  SystemUpdateAlt,
  Timelapse,
  Timeline,
} from "@material-ui/icons";
import {NewsEdit} from "./domains/news/NewsEdit";
import {NewsCreate} from "./domains/news/NewsCreate";
import {CardPriceSelectionList} from "./domains/card-price-selection/CardPriceSelectionList";
import {CardPriceSelectionShow} from "./domains/card-price-selection/CardPriceSelectionShow";
import {CardStatsV2List} from "./domains/card-stats-v2/CardStatsV2List";
import {CardStatsV2Show} from "./domains/card-stats-v2/CardStatsV2Show";
import {customRoutes} from "./infrastructure/CustomRoutes";
import {CustomLayout} from "./components/CustomLayout";
import {CardListAliasList} from "./domains/card-list-alias/CardListAliasList";
import {CardListAliasShow} from "./domains/card-list-alias/CardListAliasShow";
import {CardListAliasUpdate} from "./domains/card-list-alias/CardListAliasUpdate";
import {CardListAliasCreate} from "./domains/card-list-alias/CardListAliasCreate";
import {ItemList} from "./domains/item/ItemList";
import {ItemShow} from "./domains/item/ItemShow";
import {ItemEdit} from "./domains/item/ItemEdit";
import {UserList} from "./domains/user/UserList";
import {UserShow} from "./domains/user/UserShow";
import {UserSessionList} from "./domains/user-session/UserSessionList";
import {UserSessionShow} from "./domains/user-session/UserSessionShow";
import {UserEventList} from "./domains/user-event/UserEventList";
import {UserEventShow} from "./domains/user-event/UserEventShow";
import {SessionAggregateStatsList} from "./domains/session-aggregate-stats/SessionAggregateStatsList";
import {SessionAggregateStatsShow} from "./domains/session-aggregate-stats/SessionAggregateStatsShow";

const dataProvider = adminDataProvider(configRetriever.retrieve().apiRoot);
const App = () => {
  firebaseApp.init();

  return (
    <Admin
      dataProvider={dataProvider}
      authProvider={firebaseAuthProvider}
      customRoutes={customRoutes}
      layout={CustomLayout}
    >
      {/*<Resource name={DOMAIN.CARD} list={CardList} show={CardShow} edit={CardEdit} icon={Image} />*/}
      <Resource name={DOMAIN.ITEM} list={ItemList} show={ItemShow} edit={ItemEdit} icon={Image} />
      <Resource name={DOMAIN.SET} list={SetList} show={SetShow} icon={PhotoLibrary} />
      <Resource name={DOMAIN.EBAY_OPEN_LISTING} list={EbayOpenListingList} show={EbayOpenListingShow} icon={MonetizationOnOutlined} />
      <Resource name={DOMAIN.HISTORICAL_CARD_PRICE} list={HistoricalCardPriceList} show={HistoricalCardPriceShow} icon={MonetizationOn} />
      <Resource name={DOMAIN.USER} list={UserList} show={UserShow} icon={Person} />
      <Resource name={DOMAIN.USER_SESSION} list={UserSessionList} show={UserSessionShow} icon={Timelapse} />
      <Resource name={DOMAIN.USER_EVENT} list={UserEventList} show={UserEventShow} icon={Timeline} />
      <Resource name={DOMAIN.SESSION_AGGREGATE_STATS} list={SessionAggregateStatsList} show={SessionAggregateStatsShow} icon={Assignment} />

      <Resource name={DOMAIN.EBAY_SEARCH_PARAMS} list={EbaySearchParamList} show={EbaySearchParamsShow} create={EbaySearchParamCreate} icon={Search} />
      <Resource name={DOMAIN.CARD_PRICE_STATS} list={CardPriceStatsList} show={CardPriceStatsShow} icon={Assessment} />
      <Resource name={DOMAIN.SET_PRICE_STATS} list={SetPriceStatsList} show={SetPriceStatsShow} icon={AssessmentOutlined} />
      <Resource name={DOMAIN.CARD_PRICE_DATA_IMPORT_ATTEMPT} list={CardPriceDataImportAttemptList} show={CardPriceDataImportAttemptShow} icon={ImportExport} />
      <Resource name={DOMAIN.MIGRATION} list={MigrationList} show={MigrationShow} icon={SystemUpdateAlt} />
      <Resource name={DOMAIN.CACHE_ENTRY} list={CacheEntryList} show={CacheEntryShow} icon={Cached} />
      <Resource name={DOMAIN.CARD_SELECTION} list={CardPriceSelectionList} show={CardPriceSelectionShow} icon={Search} />
      <Resource name={DOMAIN.CARD_STATS_V2} list={CardStatsV2List} show={CardStatsV2Show} icon={Assessment} />
      <Resource name={DOMAIN.CARD_LIST_ALIAS} list={CardListAliasList} show={CardListAliasShow} edit={CardListAliasUpdate} create={CardListAliasCreate} icon={Link} />

      <Resource name={DOMAIN.NEWS} list={NewsList} show={NewsShow} create={NewsCreate} edit={NewsEdit} icon={Announcement} />
    </Admin>
  );
};

export default App;
