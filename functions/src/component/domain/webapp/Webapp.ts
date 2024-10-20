import {Endpoint} from "../../infrastructure/express/Endpoint";
import {
  BulkGetPublicCardsByIds,
  BulkGetPublicCardsByIdsV3,
  GetCardListAlias,
  GetCardStats,
  GetPublicCard,
  GetPublicCardMetadata,
  GetPublicCardsByIds,
  GetPublicCardsV2,
  GetPublicCardsV3,
  GetPublicCardTags,
  GetRelatedCardsById,
  GetUserCard,
} from "./CardWebappEndpoints";
import {GetPublicSet, GetPublicSets} from "./SetWebappEndpoints";
import {
  CreateAnonymous,
  GetCurrentUser, GetCurrentUserPercentiles,
  IsLoggedIn,
  LogIn,
  LogInWithFacebook,
  ProcessFirebaseUserDetails,
  RefreshToken,
  ResetPassword,
  SendBeacon,
  SendUserEvent,
  SignUp,
  StartSession,
  SubscribeToEmail,
  UnsubscribeFromEmail,
  UpdateUserCurrency, UpdateUsername,
} from "./UserWebappEndpoints";
import {GetPublicNews} from "./NewsWebappEndpoints";
import {GetCardsOwnedByUser, MarkCardAsNotOwned, MarkCardAsOwned} from "../card-ownership/CardOwnershipEndpoints";
import {
  GetPublicCardCollections,
  MarkCollectionAsFavourite,
  UnmarkCollectionAsFavourite,
} from "./CardCollectionWebappEndpoints";
import {
  GetCheckoutSession,
  GetProducts,
  StartBillingPortalSession,
  StartCheckoutSession,
} from "./PaymentWebappEndpoints";
import {GetRecentPrices} from "./PriceWebappEndpoints";
import {
  CreateInventoryItem,
  DeleteManyInventoryItems,
  ExportInventoryItemsCsv,
  ExportInventoryItemsJson,
  GetInventoryItems,
  UpdateInventoryItem,
} from "./InventoryWebappEndpoints";
import {
  GetPortfolioStats,
  GetPublicPortfolio,
  RequestPortfolioStatsRefresh,
  UpdatePortfolioVisibility,
} from "./PortfolioWebappEndpoints";
import {GetListingContent, GetPublicListings} from "./ListingWebappEndpoints";
import {
  BulkGetPublicBasicItemsByIdsV3,
  BulkGetPublicItemsByIdsV3, GetPublicBasicItemsV2,
  GetPublicItem,
  GetPublicItems,
  GetPublicItemsV2,
  GetPublicItemTags,
  GetRelatedItemsById,
} from "./ItemWebappEndpoints";
import {ActivateItemWatch, DeactivateItemWatch, GetItemWatchCount, GetItemWatches} from "./ItemWatchWebappEndpoints";
import {
  GetPublicMarketplaceListings,
  GetPublicMarketplaceListingsV2,
  GetPublicMarketplaceListingTags,
} from "./MarketplaceListingWebappEndpoints";
import {GetPublicTags} from "./SearchTagEndpoints";
import {GetPublicItemListing} from "./ItemListingWebappEndpoints";
import {WebappDev} from "../../debug/DebugEndpoints";
import {GetPublicTrends} from "./TrendWebappEndpoints";
import {GetItemPriceHistory, RequestHistoryBackfill} from "../item/price-history/ItemPriceHistoryEndpoints";

export const Webapp:Array<Endpoint> = [
  GetPublicCard,
  GetUserCard,
  GetPublicCardsV2,
  GetPublicCardMetadata,
  GetCardStats,
  GetPublicCardsByIds,
  GetRelatedCardsById,
  GetCardListAlias,
  BulkGetPublicCardsByIds,
  BulkGetPublicCardsByIdsV3,
  GetPublicCardsV3,
  GetPublicCardTags,

  MarkCardAsOwned,
  MarkCardAsNotOwned,
  GetCardsOwnedByUser,

  GetPublicCardCollections,
  MarkCollectionAsFavourite,
  UnmarkCollectionAsFavourite,

  GetPublicSet,
  GetPublicSets,

  CreateAnonymous,
  StartSession,
  SendBeacon,
  SignUp,
  LogIn,
  LogInWithFacebook,
  ProcessFirebaseUserDetails,
  IsLoggedIn,
  RefreshToken,
  GetCurrentUser,
  SubscribeToEmail,
  UnsubscribeFromEmail,
  ResetPassword,
  UpdateUserCurrency,
  SendUserEvent,
  GetCurrentUserPercentiles,
  UpdateUsername,

  GetPublicNews,

  GetRecentPrices,

  GetPublicListings,
  GetListingContent,

  GetPublicItems,
  GetRelatedItemsById,
  BulkGetPublicItemsByIdsV3,
  GetPublicItemsV2,
  GetPublicItemTags,
  GetPublicItem,
  BulkGetPublicBasicItemsByIdsV3,
  GetPublicBasicItemsV2,

  GetItemWatches,
  ActivateItemWatch,
  DeactivateItemWatch,
  GetItemWatchCount,

  GetProducts,
  StartCheckoutSession,
  GetCheckoutSession,
  StartBillingPortalSession,

  CreateInventoryItem,
  DeleteManyInventoryItems,
  UpdateInventoryItem,
  GetInventoryItems,
  ExportInventoryItemsCsv,
  ExportInventoryItemsJson,

  GetPortfolioStats,
  RequestPortfolioStatsRefresh,
  GetPublicPortfolio,
  UpdatePortfolioVisibility,

  GetPublicMarketplaceListings,
  GetPublicMarketplaceListingsV2,
  GetPublicMarketplaceListingTags,

  GetPublicTags,

  GetPublicItemListing,

  GetPublicTrends,

  RequestHistoryBackfill,
  GetItemPriceHistory,

  WebappDev,
];