import {UpdateSetImagesRequest} from "./SetEndpoints";
import {SetEntity} from "./SetEntity";
import {setRetriever} from "./SetRetriever";
import {setUpdater} from "./SetUpdater";


const update = async (setId:string, request:UpdateSetImagesRequest):Promise<SetEntity> => {
  const set = await setRetriever.retrieve(setId);
  if (
    (set.imageUrl && set.imageUrl === request.logoUrl)
    && (set.backgroundImageUrl && set.backgroundImageUrl === request.backgroundUrl)
  ) {
    return set;
  }
  const updatedSet = await setUpdater.update(set.id, {
    imageUrl: request.logoUrl,
    backgroundImageUrl: request.backgroundUrl || set.backgroundImageUrl,
  });
  return updatedSet;
}

export const setImagesUpdater = {
  update,
}