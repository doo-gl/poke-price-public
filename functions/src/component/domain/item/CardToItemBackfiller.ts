import {cardRepository} from "../card/CardRepository";
import {SortOrder} from "../../database/BaseCrudRepository";
import {ItemEntity, itemRepository} from "./ItemEntity";
import {toInputValueMap} from "../../tools/MapBuilder";
import {Create} from "../../database/mongo/MongoEntity";
import {cardToItemConverter} from "./CardToItemConverter";
import {logger} from "firebase-functions";


const backfill = async (startAfterId?:string):Promise<void> => {
  const iterator = cardRepository.iterator()
  if (startAfterId) {
    iterator.startAfterId(startAfterId)
  }
  await iterator
    .sort([{field: "dateCreated", order: SortOrder.ASC}])
    .batchSize(1000)
    .iterateBatch(async entities => {
      const preExistingMongoEntities = await itemRepository.getManyByLegacyId(entities.map(value => value.id))
      const idToMongoEntity = toInputValueMap(preExistingMongoEntities, input => input.legacyId)
      const creates:Array<Create<ItemEntity>> = []
      entities.forEach(entity => {
        const preExistingEntity = idToMongoEntity.get(entity.id)
        if (preExistingEntity) {
          return;
        }
        try {
          const create = cardToItemConverter.convertCreate(entity);
          // @ts-ignore
          create.legacyId = entity.id
          creates.push(create)
        } catch (err:any) {
          logger.info(`Failed to backfill card with id: ${entity.id}`, err)
          throw err
        }

      })
      await itemRepository.batchCreate(creates)
    })
}

export const cardToItemBackfiller = {
  backfill,
}