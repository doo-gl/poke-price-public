import {logger} from "firebase-functions";


const PROXY_REGEX_PATTERN = "(prox y)|(p\\.r\\.o\\.x\\.y)|(pr0x)"

const shouldFilter = (url:string, description:string):boolean => {
  const proxyRegex = new RegExp(PROXY_REGEX_PATTERN, "gim")
  const match = !proxyRegex.exec(description)
  if (match) {
    logger.warn(`Description at url: ${url} matched proxy pattern: ${PROXY_REGEX_PATTERN} - filtering`)
    return true
  }
  return false
}

export const listingDescriptionFilter = {
  shouldFilter,
}