import {SetEntity, SetRegion} from "./SetEntity";
import {Create} from "../../database/Entity";
import {convertToKey} from "../../tools/KeyConverter";
import moment from "moment/moment";
import {momentToTimestamp} from "../../tools/TimeConverter";
import {setRetriever} from "./SetRetriever";
import {setCreator} from "./SetCreator";

export interface SetCreateRequest {
  series:string,
  name:string,
  imageUrl:string,
  backgroundImageUrl:string,
  symbolUrl:string,
  releaseDate:string,
  displaySetNumber:string,
}

const calculateCreateDetails = (request:SetCreateRequest):Create<SetEntity> => {
  return {
    series: convertToKey(request.series),
    name: convertToKey(request.name),
    imageUrl: request.imageUrl,
    backgroundImageUrl: request.backgroundImageUrl,
    symbolUrl: request.symbolUrl,
    region: SetRegion.INTERNATIONAL,
    releaseDate: momentToTimestamp(moment(request.releaseDate, true)),
    displaySetNumber: request.displaySetNumber.toLowerCase(),
    totalCards: 0,
    searchKeywords: { includes: [], excludes: [], ignores: [] },
    pokePrice: null,
    externalIdentifiers: {},
    visible: false,
  }
}

const upsertSet = async (createDetails:Create<SetEntity>, preExistingSet:SetEntity|null):Promise<SetEntity> => {
  if (!preExistingSet) {
    return await setCreator.create(createDetails)
  }

  return preExistingSet
}

const create = async (request:SetCreateRequest):Promise<SetEntity> => {

  const createDetails = calculateCreateDetails(request)
  const preExistingSet = await setRetriever.retrieveOptionalSet({
    series: createDetails.series,
    set: createDetails.name,
  })
  const createdSet = await upsertSet(createDetails, preExistingSet)

  return createdSet;
}

export const adminSetCreator = {
  create,
}