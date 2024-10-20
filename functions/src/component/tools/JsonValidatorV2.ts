
import Ajv, {ErrorObject, JSONSchemaType, ValidateFunction} from "ajv";
import {BaseError} from "../error/BaseError";

const ajv = new Ajv();

export interface ValidationResult<T> {
  result:T|null,
  isValid:boolean,
  errors:Array<ErrorObject<string, Record<string, any>, unknown>> | null
}

export class ValidationError extends BaseError {

  readonly details:ErrorObject[]|null|undefined;

  constructor(message:string, errors:ErrorObject[]|null|undefined) {
    super(message);
    this.details = errors;
  }
}

const validate = <T>(value:any, schema:JSONSchemaType<T>):ValidationResult<T> => {
  const validateValue:ValidateFunction<T> = ajv.compile(schema);
  const isValid = validateValue(value);
  if (!isValid) {
    return {
      isValid: false,
      result: null,
      errors: validateValue.errors ?? null,
    }
  } else {
    return {
      isValid: true,
      result: value,
      errors: null,
    }
  }
}

const validateOrThrow = <T>(value:any, schema:JSONSchemaType<T>):T => {
  const result = validate(value, schema)
  if (!result.isValid) {
    throw new ValidationError('Failed to validate value', result.errors)
  }
  return <T>result.result
}

export const jsonValidatorV2 = {
  validate,
  validateOrThrow,
}