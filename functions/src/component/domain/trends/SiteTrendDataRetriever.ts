import {SiteTrendDataEntity, siteTrendDataRepository} from "./SiteTrendDataEntity";


const retrieveMostRecent = async ():Promise<SiteTrendDataEntity|null> => {
  const results = await siteTrendDataRepository.getMany(
    {},
    {
      sort: ["timestamp", -1],
      limit: 1,
    }
  )
  if (results.length === 0) {
    return null
  }
  return results[0]
}

export const siteTrendDataRetriever = {
  retrieveMostRecent,
}