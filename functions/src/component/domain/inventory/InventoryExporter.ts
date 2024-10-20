import {CardCondition} from "../historical-card-price/CardCondition";
import {jsonToCsv} from "../../external-lib/JsonToCsv";
import {userContext} from "../../infrastructure/UserContext";
import {InventoryItemEntity, inventoryItemRepository} from "./InventoryItemEntity";
import {fromOptionalCurrencyAmountLike} from "../money/CurrencyAmount";
import {toSet} from "../../tools/SetBuilder";
import {ItemEntity, legacyIdOrFallback} from "../item/ItemEntity";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {toCard} from "../item/CardItem";
import {cardImageToImageMapper} from "../item/CardImageToImageMapper";
import {itemPriceQuerier} from "../item/ItemPriceQuerier";
import {toGradingDetails} from "../modification/ItemModification";
import {logger} from "firebase-functions";


export interface InventoryExportRow {
  cardId:string,
  series:string,
  set:string,
  cardNumber:string,
  variant:string,
  name:string,
  setNumber:string,
  rarity:string|null,
  imageUrl:string,
  pokePriceUrl:string,
  condition:string,
  amountPaid:string|null,
  currentPokePrice:string|null,
}
export interface InventoryExportRowV2 {
  inventoryItemId:string,
  itemId:string,
  series:string,
  set:string,
  cardNumber:string,
  variant:string,
  name:string,
  setNumber:string,
  rarity:string,
  condition:string,
  gradingCompany:string,
  grade:string,
  amountPaid:string,
  pokePriceUrl:string,
  currentPokePrice:string|null,
}

export interface InventoryExport {
  inventoryItems:Array<InventoryExportRowV2>,
}

const EMPTY_ROW:InventoryExportRow = {
  cardId: "",
  series: "",
  set: "",
  cardNumber: "",
  variant: "",
  name: "",
  setNumber: "",
  rarity: "",
  imageUrl: "",
  pokePriceUrl: "",
  condition: "",
  amountPaid: "",
  currentPokePrice: "",
}

const EMPTY_ROW_V2:InventoryExportRowV2 = {
  inventoryItemId: "",
  itemId: "",
  series: "",
  set: "",
  cardNumber: "",
  variant: "",
  name: "",
  setNumber: "",
  rarity: "",
  condition: "",
  grade: "",
  gradingCompany: "",
  amountPaid: "",
  currentPokePrice: "",
  pokePriceUrl: "",
}

const mapRow = (card:ItemEntity, inventoryItem:InventoryItemEntity):InventoryExportRowV2|null => {
  try {
    const details = toCard(card);
    if (!details) {
      return null;
    }
    const gradingDetails = toGradingDetails(inventoryItem.itemDetails.grade)
    return {
      inventoryItemId: inventoryItem.id,
      itemId: card._id.toString(),
      series: details.series,
      set: details.set,
      cardNumber: details.cardNumber,
      variant: details.variant,
      name: card.displayName,
      setNumber: details.setNumber,
      rarity: details.rarity ?? "",
      condition: inventoryItem.itemDetails.condition ?? CardCondition.NEAR_MINT,
      amountPaid: fromOptionalCurrencyAmountLike(inventoryItem.amountPaid)?.toString() ?? "",
      grade: gradingDetails?.grade ?? "",
      gradingCompany: gradingDetails?.graderName ?? "",
      pokePriceUrl: `https://pokeprice.io/card/${legacyIdOrFallback(card)}`,
      currentPokePrice: fromOptionalCurrencyAmountLike(itemPriceQuerier.pokePrice(card)?.price ?? null)?.toString() ?? null,
    }
  } catch (err) {
    logger.error(`Failed to map export row for item: ${card._id.toString()}`)
    return null
  }

}

const exportRows = async ():Promise<Array<InventoryExportRowV2>> => {
  const user = userContext.getUserOrThrow();
  logger.info(`Exporting rows for user: ${user.id}`)
  const rows:Array<InventoryExportRowV2> = [];
  const cardIdToCard = new Map<string, ItemEntity>()
  try {
    await inventoryItemRepository.iterator()
      .queries([
        {field: "userId", operation: "==", value: user.id},
      ])
      .batchSize(300)
      .iterateBatch(async inventoryItems => {
        const cardIdsToFetch = toSet(
          inventoryItems.filter(inventoryItem => !cardIdToCard.has(inventoryItem.itemId)),
          inventoryItem => inventoryItem.itemId
        );
        const fetchedCards = await cardItemRetriever.retrieveByIds([...cardIdsToFetch.values()]);
        fetchedCards.forEach(card => cardIdToCard.set(legacyIdOrFallback(card), card));
        inventoryItems.forEach(inventoryItem => {
          const card = cardIdToCard.get(inventoryItem.itemId);
          if (!card) {
            return
          }
          const row = mapRow(card, inventoryItem)
          if (!row) {
            return;
          }
          rows.push(row);
        })
      })
  } catch (err:any) {
    logger.error(`Failed to export rows for user: ${user.id}, ${err.message}`, err)
    throw err
  }

  return rows;
}

const exportJson = async ():Promise<InventoryExport> => {
  return {
    inventoryItems: await exportRows(),
  }
}

const exportCsv = async ():Promise<string> => {
  const rows = await exportRows();
  if (rows.length === 0) {
    return jsonToCsv.parse([EMPTY_ROW_V2])
  }
  return jsonToCsv.parse(rows)
}

export const inventoryExporter = {
  exportCsv,
  exportJson,
}