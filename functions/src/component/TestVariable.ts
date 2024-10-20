import {Endpoint, Method} from "./infrastructure/express/Endpoint";
import {NO_AUTHORIZATION} from "./infrastructure/Authorization";
import {logger} from "firebase-functions";
import {userRepository} from "./domain/user/UserRepository";
import {itemRepository} from "./domain/item/ItemEntity";
import {ebayOpenListingRepository} from "./domain/ebay/open-listing/EbayOpenListingRepository";



export const TEST_ENDPOINTS:Array<Endpoint> = [
  {
    auth: NO_AUTHORIZATION,
    method: Method.GET,
    path: "/",
    requestHandler: async (req, res, next) => {

      logger.info("REQUEST SENT")
      const result1 = await itemRepository.getMany({}, {limit: 1})
      const result2 = await ebayOpenListingRepository.getMany([], {limit: 1})
      const result = {
        result1,
        result2,
      }
      return {result}
    },
  },
]