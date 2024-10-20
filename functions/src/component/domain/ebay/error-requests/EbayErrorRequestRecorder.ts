import {baseEbayErrorRequestCreator} from "./EbayErrorRequestEntity";
import {ExternalClientError} from "../../../error/ExternalClientError";
import {logger} from "firebase-functions";


const record = async (error:ExternalClientError):Promise<void> => {
  try {
    await baseEbayErrorRequestCreator.create({
      url: error.url ?? "",
      body: error.responseBody ?? "",
      headers: error.responseHeaders,
      status: error.responseStatus ?? null,
    })
  } catch (err:any) {
    logger.error(`Failed to record error: ${err.message}`)
  }
}

export const ebayErrorRequestRecorder = {
  record,
}