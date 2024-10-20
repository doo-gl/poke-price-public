import {JSONSchemaType} from "ajv";
import {SingleCardInventoryItemDetails} from "./InventoryItemEntity";
import {ItemType} from "../item/ItemEntity";
import {ValidationError} from "../../error/ValidationError";
import {jsonValidator} from "../../tools/JsonValidator";
import {gradingModificationDetailsSchema} from "../modification/ItemModification";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {GENERIC_ITEM_TYPE} from "../marketplace/item-details/GenericItemDetails";

const singleCardInventoryItemDetailsSchema:JSONSchemaType<SingleCardInventoryItemDetails> = {
  type: "object",
  properties: {
    condition: { type: "string" },
    grade: {...gradingModificationDetailsSchema, nullable: true},
  },
  additionalProperties: false,
  required: ["condition", "grade"],
}

const genericInventoryItemDetailsSchema:JSONSchemaType<{}> = {
  type: "object",
  properties: {
  },
  additionalProperties: false,
  required: [],
}

const validateSingleCard = (itemType:string, itemDetails:any):SingleCardInventoryItemDetails => {
  return jsonValidator.validate(itemDetails, singleCardInventoryItemDetailsSchema)
}
const validateGeneric = (itemType:string, itemDetails:any):{} => {
  return jsonValidator.validate(itemDetails, genericInventoryItemDetailsSchema)
}

const validate = (itemType:string, itemDetails:any):void => {
  if (itemType === ItemType.SINGLE_CARD) {
    validateSingleCard(itemType, itemDetails)
    return;
  }
  if (itemType === SINGLE_POKEMON_CARD_ITEM_TYPE) {
    validateSingleCard(itemType, itemDetails)
    return;
  }
  if (itemType === GENERIC_ITEM_TYPE) {
    validateGeneric(itemType, itemDetails)
    return;
  }

  throw new ValidationError(`Item type: ${itemType}, not recognised`, undefined)
}

export const inventoryItemDetailsValidator = {
  validate,
  validateSingleCard,
}