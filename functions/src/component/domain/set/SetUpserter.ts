import {SetEntity} from "./SetEntity";
import {Create, Update} from "../../database/Entity";
import {setCreator} from "./SetCreator";
import {isProduction} from "../../infrastructure/ProductionDecider";
import {setImageUploader} from "./SetImageUploader";
import {setRetriever} from "./SetRetriever";
import {setUpdater} from "./SetUpdater";
import {lodash} from "../../external-lib/Lodash";

const findPreExistingSet = async (createSet:Create<SetEntity>):Promise<SetEntity|null> => {
  const setFromName = await setRetriever.retrieveOptionalSet({series: createSet.series, set: createSet.name})
  if (setFromName) {
    return setFromName
  }
  // @ts-ignore
  const tcgApiCode:any = createSet.externalIdentifiers["POKEMON_TCG_API"]?.code
  if (tcgApiCode) {
    return await setRetriever.retrieveSetByPokemonTcgApiId(tcgApiCode)
  }
  return null
}

const calculateSetUpdate = (preExistingSet:SetEntity, newSet:Create<SetEntity>):Update<SetEntity>|null => {
  const updateSet:Update<SetEntity> = {};

  if (newSet.setCode && preExistingSet.setCode !== newSet.setCode) {
    updateSet.setCode = newSet.setCode
  }

  if (
    (!preExistingSet.externalIdentifiers.POKEMON_TCG_API && newSet.externalIdentifiers.POKEMON_TCG_API)
    || lodash.isNotEqual(preExistingSet.externalIdentifiers.POKEMON_TCG_API, newSet.externalIdentifiers.POKEMON_TCG_API)
  ) {
    updateSet.externalIdentifiers = preExistingSet.externalIdentifiers;
    updateSet.externalIdentifiers.POKEMON_TCG_API = newSet.externalIdentifiers.POKEMON_TCG_API;
  }

  if (
    (!preExistingSet.externalIdentifiers.TCG_COLLECTOR_WEBSITE && newSet.externalIdentifiers.TCG_COLLECTOR_WEBSITE)
    || lodash.isNotEqual(preExistingSet.externalIdentifiers.TCG_COLLECTOR_WEBSITE, newSet.externalIdentifiers.TCG_COLLECTOR_WEBSITE)
  ) {
    updateSet.externalIdentifiers = preExistingSet.externalIdentifiers;
    updateSet.externalIdentifiers.TCG_COLLECTOR_WEBSITE = newSet.externalIdentifiers.TCG_COLLECTOR_WEBSITE;
  }

  const updateFields = Object.keys(updateSet);
  return updateFields.length > 0 ? updateSet : null;
}

const upsert = async (createSet:Create<SetEntity>):Promise<SetEntity> => {
  const preExistingSet = await findPreExistingSet(createSet)

  if (!preExistingSet) {
    const createdSet = await setCreator.create(createSet);
    if (isProduction()) {
      await setImageUploader.uploadLogo(createdSet.id, createdSet.imageUrl)
      if (createdSet.symbolUrl) {
        await setImageUploader.uploadSymbol(createdSet.id, createdSet.symbolUrl)
      }
      if (createdSet.backgroundImageUrl) {
        await setImageUploader.uploadBackgroundUrl(createdSet.id, createdSet.backgroundImageUrl)
      }
    }
    return await setRetriever.retrieve(createdSet.id)
  }

  const updateSet = await calculateSetUpdate(preExistingSet, createSet);
  if (!updateSet) {
    return preExistingSet
  }
  return setUpdater.update(preExistingSet.id, updateSet);
}

export const setUpserter = {
  upsert,
}