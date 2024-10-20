import {functions} from "../external-lib/FirebaseFunctions";
import {UnexpectedError} from "../error/UnexpectedError";
import {isProduction} from "./ProductionDecider";

export interface FirebaseConfig {
  apiKey:string,
  authDomain:string,
  messagingSenderId:string,
  appId:string,
}

export interface Config {
  basicAuthKey:() => string,
  pokemonTcgApiKey:() => string|null,
  apiRoot:() => string,
  publicRootUrl:() => string,
  firebaseApiKey:() => string|null,
  currencyExchangeRateApiKey:() => string|null,
  stripeSecretKey:() => string|null,
  stripeWebhookSecret:() => string|null,
  mailchimpTransactionalApiKey:() => string|null,
  mailchimpMarketingApiKey:() => string|null,
  rapidApiProxySecret:() => string|null,
  mongoUser:() => string,
  mongoPassword:() => string|null,
  mongoHost:() => string,
  mongoPort:() => string|null,
  mongoDatabase:() => string,
  mongoAuthSource:() => string,
  twitterClientId:() => string,
  twitterClientSecret:() => string|null,
  twitterAppKey:() => string|null,
  twitterAppSecret:() => string|null,
  twitterFeedAccessToken:() => string|null,
  twitterFeedAccessSecret:() => string|null,
  facebookBackendAppId:() => string,
  facebookBackendAppSecret:() => string|null,
  facebookPageId:() => string,
  facebookPageAccessToken:() => string|null,
  instagramUserId:() => string,
  tcgApiIntegrationToken:() => string|null,
  ebayApiClientId:() => string,
  ebayApiClientSecret:() => string,
}

const nonNullParam = (config:any, name:string):() => string => {
  return () => {
    const param = config[name];
    if (!param) {
      throw new UnexpectedError(`Config ${name} is missing from legacy config`);
    }
    return param;
  }
}

const nullableParam = (config:any, name:string):() => string|null => {
  return () => {
    const param = config[name];
    if (!param) {
      return null;
    }
    return param;
  }
}

const readFromLegacyFirebaseStyleConfig = ():Config => {
  if (!functions.config().pokeprice) {
    throw new UnexpectedError(`No legacy firebase style config`);
  }
  const pokePriceConfig = functions.config().pokeprice;
  return {
    basicAuthKey: nonNullParam(pokePriceConfig, 'basicauthkey'),
    pokemonTcgApiKey: nonNullParam(pokePriceConfig, 'pokemontcgapikey'),
    apiRoot: isProduction()
      ? () => 'INSERT_PROD_API_ENDPOINT_HERE'
      : () => 'INSERT_LOCAL_API_ENDPOINT_HERE',
    publicRootUrl: isProduction()
      ? () => 'INSERT_PROD_SITE_HERE'
      : () => 'http://localhost:19006',
    firebaseApiKey: nonNullParam(pokePriceConfig, 'firebaseapikey'),
    currencyExchangeRateApiKey: nonNullParam(pokePriceConfig, 'currencyexchangerateapikey'),
    stripeSecretKey: nonNullParam(pokePriceConfig, 'stripesecretkey'),
    stripeWebhookSecret: nonNullParam(pokePriceConfig, 'stripewebhooksecret'),
    mailchimpTransactionalApiKey: nonNullParam(pokePriceConfig, 'mailchimptransactionalapikey'),
    mailchimpMarketingApiKey: nonNullParam(pokePriceConfig, 'mailchimpmarketingapikey'),
    rapidApiProxySecret: nonNullParam(pokePriceConfig, 'rapidapiproxysecret'),
    mongoUser: nonNullParam(pokePriceConfig, 'mongouser'),
    mongoPassword: nonNullParam(pokePriceConfig, 'mongopassword'),
    mongoHost: nonNullParam(pokePriceConfig, 'mongohost'),
    mongoPort: nullableParam(pokePriceConfig, 'mongoport'),
    mongoDatabase: nonNullParam(pokePriceConfig, 'mongodatabase'),
    mongoAuthSource: nonNullParam(pokePriceConfig, 'mongoauthsource'),
    twitterClientId: nonNullParam(pokePriceConfig, 'twitterclientid'),
    twitterClientSecret: nonNullParam(pokePriceConfig, 'twitterclientsecret'),
    twitterAppKey: nonNullParam(pokePriceConfig, 'twitterappkey'),
    twitterAppSecret: nonNullParam(pokePriceConfig, 'twitterappsecret'),
    twitterFeedAccessToken: nonNullParam(pokePriceConfig, 'twitterfeedaccesstoken'),
    twitterFeedAccessSecret: nonNullParam(pokePriceConfig, 'twitterfeedaccesssecret'),
    facebookBackendAppId: nonNullParam(pokePriceConfig, 'facebookbackendappid'),
    facebookBackendAppSecret: nonNullParam(pokePriceConfig, 'facebookbackendappsecret'),
    facebookPageAccessToken: nonNullParam(pokePriceConfig, 'facebookpageaccesstoken'),
    facebookPageId: nonNullParam(pokePriceConfig, 'facebookpageid'),
    instagramUserId: nonNullParam(pokePriceConfig, 'instagramuserid'),
    tcgApiIntegrationToken: nonNullParam(pokePriceConfig, 'tcgapiintegrationtoken'),
    ebayApiClientId: nonNullParam(pokePriceConfig, 'ebayapiclientid'),
    ebayApiClientSecret: nonNullParam(pokePriceConfig, 'ebayapiclientsecret'),
  }
}

export enum ENV_VAR_SECRETS {
  POKEMON_TCG_API_KEY = 'POKEMON_TCG_API_KEY',
  FIREBASE_API_KEY = 'POKEPRICE_FIREBASE_API_KEY',
  CURRENCY_EXCHANGE_RATE_API_KEY = 'CURRENCY_EXCHANGE_RATE_API_KEY',
  STRIPE_SECRET_KEY = 'STRIPE_SECRET_KEY',
  STRIPE_WEBHOOK_SECRET = 'STRIPE_WEBHOOK_SECRET',
  MAILCHIMP_TRANSACTIONAL_API_KEY = 'MAILCHIMP_TRANSACTIONAL_API_KEY',
  MAILCHIMP_MARKETING_API_KEY = 'MAILCHIMP_MARKETING_API_KEY',
  RAPID_API_PROXY_SECRET = 'RAPID_API_PROXY_SECRET',
  MONGO_PASSWORD = 'MONGO_PASSWORD',
  FACEBOOK_BACKEND_APP_SECRET = 'FACEBOOK_BACKEND_APP_SECRET',
  TCG_API_INTEGRATION_TOKEN = 'TCG_API_INTEGRATION_TOKEN',
  EBAY_API_CLIENT_SECRET = 'EBAY_API_CLIENT_SECRET',
}

const nonNullEnvVar = (name:string):() => string => {
  return () => {
    const param = process.env[name];
    if (!param || param.length === 0) {
      throw new UnexpectedError(`Config ${name} is missing from env var`);
    }
    return param;
  }
}

const nullableEnvVar = (name:string):() => string|null => {
  return () => {
    const param = process.env[name];
    if (!param || param.length === 0) {
      return null;
    }
    return param;
  }
}

const readFromEnvironmentVariables = ():Config => {
  // will throw error if not defined
  nonNullEnvVar('BASIC_AUTH_KEY')()


  return {
    basicAuthKey: nonNullEnvVar('BASIC_AUTH_KEY'),
    pokemonTcgApiKey: nullableEnvVar(ENV_VAR_SECRETS.POKEMON_TCG_API_KEY),
    apiRoot: isProduction()
      ? () => 'INSERT_PROD_API_ENDPOINT_HERE'
      : () => 'INSERT_LOCAL_API_ENDPOINT_HERE',
    publicRootUrl: isProduction()
      ? () => 'INSERT_PROD_SITE_HERE'
      : () => 'http://localhost:19006',
    firebaseApiKey: nullableEnvVar(ENV_VAR_SECRETS.FIREBASE_API_KEY),
    currencyExchangeRateApiKey: nullableEnvVar(ENV_VAR_SECRETS.CURRENCY_EXCHANGE_RATE_API_KEY),
    stripeSecretKey: nullableEnvVar(ENV_VAR_SECRETS.STRIPE_SECRET_KEY),
    stripeWebhookSecret: nullableEnvVar(ENV_VAR_SECRETS.STRIPE_WEBHOOK_SECRET),
    mailchimpTransactionalApiKey: nullableEnvVar(ENV_VAR_SECRETS.MAILCHIMP_TRANSACTIONAL_API_KEY),
    mailchimpMarketingApiKey: nullableEnvVar(ENV_VAR_SECRETS.MAILCHIMP_MARKETING_API_KEY),
    rapidApiProxySecret: nullableEnvVar(ENV_VAR_SECRETS.RAPID_API_PROXY_SECRET),
    mongoUser: nonNullEnvVar("MONGO_USER"),
    mongoPassword: nullableEnvVar(ENV_VAR_SECRETS.MONGO_PASSWORD),
    mongoHost: nonNullEnvVar("MONGO_HOST"),
    mongoPort: nullableEnvVar("MONGO_PORT"),
    mongoDatabase: nonNullEnvVar("MONGO_DATABASE"),
    mongoAuthSource: nonNullEnvVar("MONGO_AUTH_SOURCE"),
    twitterClientId: nonNullEnvVar("TWITTER_CLIENT_ID"),
    twitterClientSecret: nullableEnvVar(ENV_VAR_SECRETS.TWITTER_CLIENT_SECRET),
    twitterAppKey: nullableEnvVar(ENV_VAR_SECRETS.TWITTER_APP_KEY),
    twitterAppSecret: nullableEnvVar( ENV_VAR_SECRETS.TWITTER_APP_SECRET),
    twitterFeedAccessToken: nullableEnvVar(ENV_VAR_SECRETS.TWITTER_FEED_ACCESS_TOKEN),
    twitterFeedAccessSecret: nullableEnvVar(ENV_VAR_SECRETS.TWITTER_FEED_ACCESS_SECRET),
    facebookBackendAppId: nonNullEnvVar("FACEBOOK_BACKEND_APP_ID"),
    facebookBackendAppSecret: nullableEnvVar(ENV_VAR_SECRETS.FACEBOOK_BACKEND_APP_SECRET),
    facebookPageAccessToken: nullableEnvVar(ENV_VAR_SECRETS.FACEBOOK_PAGE_ACCESS_TOKEN),
    facebookPageId: nonNullEnvVar("FACEBOOK_PAGE_ID"),
    instagramUserId: nonNullEnvVar("INSTAGRAM_USER_ID"),
    tcgApiIntegrationToken: nullableEnvVar(ENV_VAR_SECRETS.TCG_API_INTEGRATION_TOKEN),
    ebayApiClientId: nonNullEnvVar("EBAY_API_CLIENT_ID"),
    ebayApiClientSecret: nonNullEnvVar(ENV_VAR_SECRETS.EBAY_API_CLIENT_SECRET),
  }
}

const retrieve = ():Config => {
  try {
    return readFromEnvironmentVariables();
  } catch (err) {
    if (err instanceof UnexpectedError) {
      return readFromLegacyFirebaseStyleConfig()
    }
    throw err
  }
}

const retrieveParam = (key:string):string => {
  return nonNullEnvVar(key)()
}
const retrieveOptionalParam = (key:string):string|null => {
  return nullableEnvVar(key)()
}
const retrieveParamOrFallback = (key:string, fallback:string):string => {
  return nullableEnvVar(key)() ?? fallback
}

export const configRetriever = {
  retrieve,
  retrieveParam,
  retrieveOptionalParam,
  retrieveParamOrFallback,
}