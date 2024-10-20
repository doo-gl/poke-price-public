import Ajv, {JSONSchemaType, ValidateFunction} from "ajv";
import {ValidationError} from "../error/ValidationError";


const ajv = new Ajv();

const validate = <T>(value:any, schema:JSONSchemaType<T>):T => {
  const validateValue:ValidateFunction<T> = ajv.compile(schema);
  const isValid = validateValue(value);
  if (!isValid) {
    throw new ValidationError('Failed to validate value', validateValue.errors)
  }
  return value;
}

export const jsonValidator = {
  validate,
}