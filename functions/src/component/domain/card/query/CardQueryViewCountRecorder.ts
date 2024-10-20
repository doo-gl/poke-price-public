import {CardRequest} from "../PublicCardDtoRetrieverV2";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import moment from "moment/moment";
import {cardQueryViewCountRetriever} from "./CardQueryViewCountRetriever";
import {cardQueryViewCountCreator, cardQueryViewCountUpdater} from "./CardQueryViewCountEntity";
import {momentToTimestamp} from "../../../tools/TimeConverter";
import {logger} from "firebase-functions";

const tagKey = (tag:{name:string,value:string}):string => {
  return `${tag.name}=${tag.value}`
}

const record = async (request:CardRequest):Promise<void> => {
  const start = moment()
  try {
    const tags:Array<{name:string,value:string}> = Object.entries(request)
      .filter(entry => !!entry[1])
      .map(entry => {
        const name = entry[0];
        const value = Array.isArray(entry[1])
          ? entry[1].sort().join('&')
          : entry[1];
        return {
          name,
          value,
        }
      })
      .sort(comparatorBuilder.objectAttributeASC(tag => tagKey(tag)))
    const tagKeys = tags.map(tag => tagKey(tag));
    const key = tagKeys.join('|');
    const date = moment().startOf('day');

    const viewCount = await cardQueryViewCountRetriever.retrieveByDateAndKey(date, key);
    if (viewCount) {
      await cardQueryViewCountUpdater.updateOnly(viewCount.id, { count: viewCount.count + 1 })
    } else {
      await cardQueryViewCountCreator.create({
        key,
        tagKeys,
        tags,
        date: momentToTimestamp(date),
        count: 1,
      })
    }
  } catch (err:any) {
    logger.error(`Failed to record query, ${err.message}`, err)
  }
  const end = moment();
  logger.info(`Recording view count took: ${end.diff(start, 'milliseconds')}ms`)
}

export const cardQueryViewCountRecorder = {
  record,
}