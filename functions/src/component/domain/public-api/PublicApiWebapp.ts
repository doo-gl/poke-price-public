import {Endpoint} from "../../infrastructure/express/Endpoint";
import {GetManyCards, GetManySets, GetOneCard, GetOneSet} from "./PublicApiEndpoints";

export const PUBLIC_API_DEFAULT_LIMIT = 50;
export const PUBLIC_API_MAX_LIMIT = 200;

export const PublicApiWebapp:Array<Endpoint> = [
  GetOneCard,
  GetManyCards,
  GetOneSet,
  GetManySets,
]