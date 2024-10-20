import {browserLocation} from "../common/BrowserLocation";
import {UnexpectedError} from "../common/UnexpectedError";

export interface FirebaseConfig {
  apiKey:string,
  authDomain:string,
  projectId:string,
  storageBucket:string,
  messagingSenderId:string,
  appId:string,
  measurementId:string
}

export interface Config {
  apiRoot:string,
  auth:string,
  firebase:FirebaseConfig,
  useAuthEmulator:boolean,
}

const LOCAL_DEV_CONFIG:Config = {
  apiRoot: '',
  auth: '',
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
  },
  useAuthEmulator: true,
}
const PROD_CONFIG:Config = {
  apiRoot: '',
  auth: '',
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
  },
  useAuthEmulator: false,
}

const DEV_REGEX = /https:\/\/pokeprice-admin--pokeprice-admin-dev-[a-z0-9]+\.web\.app/
const retrieve = ():Config => {
  const url = browserLocation.getUrl();
  if (url.origin === 'http://localhost:3000') {
    return LOCAL_DEV_CONFIG;
  }
  if (url.origin.match(DEV_REGEX)) {
    return PROD_CONFIG;
  }
  if (url.origin === 'INSERT_PROD_ADMIN_URL_HERE') {
    return PROD_CONFIG;
  }
  throw new UnexpectedError(`PokePrice is being accessed from a non recognised origin: ${url.origin}`);
}

export const configRetriever = {
  retrieve
}