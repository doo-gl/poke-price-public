import {SetEntity} from "../set/SetEntity";
import {setRetriever} from "../set/SetRetriever";
import {UnexpectedError} from "../../error/UnexpectedError";
import {setDeleter} from "../set/SetDeleter";
import {setInfoSourcer, SetSourceResult} from "./SetInfoSourcer";
import {toCard} from "../item/CardItem";
import {itemUpdater} from "../item/ItemEntity";
import {cardItemRetriever} from "../item/CardItemRetriever";

const getHiddenFates = async ():Promise<SetEntity> => {
  const hiddenFates = await setRetriever.retrieveOptionalSet({ series: 'sun-and-moon', set: 'hidden-fates' });
  if (hiddenFates) {
    return hiddenFates;
  }
  const sourcedHiddenFates = await setInfoSourcer.source('sm115');
  if (!sourcedHiddenFates.set) {
    throw new UnexpectedError(`Cannot get hidden-fates`);
  }
  return sourcedHiddenFates.set;
}
const getShiningFates = async ():Promise<SetEntity> => {
  const shiningFates = await setRetriever.retrieveOptionalSet({ series: 'sword-and-shield', set: 'shining-fates' });
  if (shiningFates) {
    return shiningFates;
  }
  const sourcedShiningFates = await setInfoSourcer.source('swsh45');
  if (!sourcedShiningFates.set) {
    throw new UnexpectedError(`Cannot get shining-fates`);
  }
  return sourcedShiningFates.set;
}

const applyHacks = async (sourcedSet:SetSourceResult):Promise<SetSourceResult> => {

  const set = sourcedSet.set;
  if (set && set.series === 'sun-and-moon' && set.name === 'shiny-vault') {
    // the shiny vault series does not exist, it is part of the hidden-fates set
    // get or create the hidden fates set
    // update all cards in shiny vault to point to hidden fates
    // delete the shiny vault set.
    const hiddenFates = await getHiddenFates();
    const updatedCards = Promise.all(
      sourcedSet.cards.map(card => {
        const cardDetails = toCard(card);
        if (!cardDetails) {
          return card
        }
        return itemUpdater.updateAndReturn(card._id, {
          itemDetails: {
            ...cardDetails,
            series: hiddenFates.series,
            set: hiddenFates.name,
            setId: hiddenFates.id,
          },
        });
      })
    )
    const deletedSet = await setDeleter.deleteSet({ series: set.series, set: set.name });
    const allHiddenFatesCards = await cardItemRetriever.retrieveByUniqueSet({ series: hiddenFates.series, set: hiddenFates.name });
    return {
      set: hiddenFates,
      cards: allHiddenFatesCards,
    };
  }

  if (set && set.series === 'sword-and-shield' && set.name === 'shiny-vault') {
    // the shiny vault series does not exist, it is part of the shining-fates set
    // get or create the shining fates set
    // update all cards in shiny vault to point to shining fates
    // delete the shiny vault set.
    const shiningFates = await getShiningFates();
    const updatedCards = Promise.all(
      sourcedSet.cards.map(card => {
        const cardDetails = toCard(card);
        if (!cardDetails) {
          return card
        }
        return itemUpdater.updateAndReturn(card._id, {
          itemDetails: {
            ...cardDetails,
            series: shiningFates.series,
            set: shiningFates.name,
            setId: shiningFates.id,
          },
        });
      })
    )
    const deletedSet = await setDeleter.deleteSet({ series: set.series, set: set.name });
    const allShiningFatesCards = await cardItemRetriever.retrieveByUniqueSet({ series: shiningFates.series, set: shiningFates.name });
    return {
      set: shiningFates,
      cards: allShiningFatesCards,
    };
  }

  return sourcedSet;
}

export const sourcedSetHacks = {
  applyHacks,
}