import {InvalidArgumentError} from "../error/InvalidArgumentError";
import QueryString from 'qs'
import moment, {Moment} from "moment";

const DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';
export const nullableTimestamp = ():ParamReader<Moment|null> => {
  return (paramName:string, param:string|string[]|undefined):Moment|null => {
    if (param === undefined) {
      return null;
    }
    if (Array.isArray(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} was expected to have a single value, but multiple values have been passed.`);
    }
    const result = moment(param, DATE_FORMAT, true);
    if (!result.isValid()) {
      throw new InvalidArgumentError(`Invalid date in param: ${paramName}, value: ${param}, allowed format is: '${DATE_FORMAT}'`)
    }
    return result;
  }
}
export const nonNullTimestamp = ():ParamReader<Moment> => {
  return (paramName:string, param:string|string[]|undefined):Moment => {
    if (param === undefined) {
      throw new InvalidArgumentError(`Param: ${paramName} is required`);
    }
    if (Array.isArray(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} was expected to have a single value, but multiple values have been passed.`);
    }
    const result = moment(param, DATE_FORMAT, true);
    if (!result.isValid()) {
      throw new InvalidArgumentError(`Invalid date in param: ${paramName}, value: ${param}, allowed format is: '${DATE_FORMAT}'`)
    }
    return result;
  }
}



export const nullableNumber = ():ParamReader<number|null> => {
  return (paramName:string, param:string|string[]|undefined):number|null => {
    if (param === undefined) {
      return null;
    }
    if (Array.isArray(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} was expected to have a single value, but multiple values have been passed.`);
    }
    const result = Number.parseFloat(param);
    return result;
  }
}

export const numberWithDefault = (defaultValue:number):ParamReader<number> => {
  return (paramName:string, param:string|string[]|undefined):number => {
    if (param === undefined) {
      return defaultValue;
    }
    if (Array.isArray(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} was expected to have a single value, but multiple values have been passed.`);
    }
    const result = Number.parseFloat(param);
    return result;
  }
}

export const nullableString = ():ParamReader<string|null> => {
  return (paramName:string, param:string|string[]|undefined):string|null => {
    if (param === undefined) {
      return null;
    }
    if (Array.isArray(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} was expected to have a single value, but multiple values have been passed.`);
    }
    return param;
  }
}

export const optionalString = ():ParamReader<string|undefined> => {
  return (paramName:string, param:string|string[]|undefined):string|undefined => {
    if (param === undefined) {
      return undefined;
    }
    if (Array.isArray(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} was expected to have a single value, but multiple values have been passed.`);
    }
    return param;
  }
}

export const optionalNumber = ():ParamReader<number|undefined> => {
  return (paramName:string, param:string|string[]|undefined):number|undefined => {
    if (param === undefined) {
      return undefined;
    }
    if (Array.isArray(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} was expected to have a single value, but multiple values have been passed.`);
    }
    return Number.parseFloat(param);
  }
}



export const nullableBoolean = ():ParamReader<boolean|null> => {
  return (paramName:string, param:string|string[]|undefined):boolean|null => {
    if (param === undefined) {
      return null;
    }
    if (Array.isArray(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} was expected to have a single value, but multiple values have been passed.`);
    }
    return param === 'true';
  }
}

export const nonNullMappedString = (mappings:{[key:string]:string}):ParamReader<string> => {
  return (paramName:string, param:string|string[]|undefined):string => {
    if (param === undefined) {
      throw new InvalidArgumentError(`Param: ${paramName} is required`);
    }
    if (Array.isArray(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} was expected to have a single value, but multiple values have been passed.`);
    }
    const mappedValue = mappings[param];
    if (!mappedValue) {
      throw new InvalidArgumentError(`Param: ${paramName}=${param} is not one of the allowed values: ${Object.keys(mappings).join(',')}`);
    }
    return param;
  }
}

export const mappedStringWithDefault = (mappings:{[key:string]:string}, defaultValue:string):ParamReader<string> => {
  return (paramName:string, param:string|string[]|undefined):string => {
    if (param === undefined) {
      return defaultValue;
    }
    if (Array.isArray(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} was expected to have a single value, but multiple values have been passed.`);
    }
    const mappedValue = mappings[param];
    if (!mappedValue) {
      throw new InvalidArgumentError(`Param: ${paramName}=${param} is not one of the allowed values: ${Object.keys(mappings).join(',')}`);
    }
    return param;
  }
}

export const nonNullEnum = <ENUM extends string>(allowedEnumValues:{[key in ENUM]:string}):ParamReader<ENUM> => {
  return (paramName:string, param:string|string[]|undefined):ENUM => {
    if (param === undefined) {
      throw new InvalidArgumentError(`Param: ${paramName} is required`);
    }
    if (Array.isArray(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} was expected to have a single value, but multiple values have been passed.`);
    }
    if (!Object.keys(allowedEnumValues).includes(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} is required to be one of the following values: ${Object.keys(allowedEnumValues).join(',')}, actual: ${param}`);
    }
    return <ENUM>param;
  }
}

export const nullableEnum = <ENUM extends string>(allowedEnumValues:{[key in ENUM]:string}):ParamReader<ENUM|null> => {
  return (paramName:string, param:string|string[]|undefined):ENUM|null => {
    if (param === undefined) {
      return null;
    }
    if (Array.isArray(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} was expected to have a single value, but multiple values have been passed.`);
    }
    if (!Object.keys(allowedEnumValues).includes(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} is required to be one of the following values: ${Object.keys(allowedEnumValues).join(',')}, actual: ${param}`);
    }
    return <ENUM>param;
  }
}

export const optionalEnum = <ENUM extends string>(allowedEnumValues:{[key in ENUM]:string}):ParamReader<ENUM|undefined> => {
  return (paramName:string, param:string|string[]|undefined):ENUM|undefined => {
    if (param === undefined) {
      return undefined;
    }
    if (Array.isArray(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} was expected to have a single value, but multiple values have been passed.`);
    }
    if (!Object.keys(allowedEnumValues).includes(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} is required to be one of the following values: ${Object.keys(allowedEnumValues).join(',')}, actual: ${param}`);
    }
    return <ENUM>param;
  }
}

export const enumWithDefault = <ENUM extends string>(allowedEnumValues:{[key in ENUM]:string}, defaultValue:ENUM):ParamReader<ENUM> => {
  return (paramName:string, param:string|string[]|undefined):ENUM => {
    if (param === undefined) {
      return defaultValue;
    }
    if (Array.isArray(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} was expected to have a single value, but multiple values have been passed.`);
    }
    if (!Object.keys(allowedEnumValues).includes(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} is required to be one of the following values: ${Object.keys(allowedEnumValues).join(',')}, actual: ${param}`);
    }
    return <ENUM>param;
  }
}

export const nullableEnums = <ENUM extends string>(allowedEnumValues:{[key in ENUM]:string}):ParamReader<Array<ENUM>|null> => {
  return (paramName:string, param:string|string[]|undefined):Array<ENUM>|null => {
    if (param === undefined) {
      return null;
    }
    if (Array.isArray(param)) {
      const someInvalidParams = param.some(p => !Object.keys(allowedEnumValues).includes(p))
      if (someInvalidParams) {
        throw new InvalidArgumentError(`Param: ${paramName} is required to be one of the following values: ${Object.keys(allowedEnumValues).join(',')}, actual: ${param.join(',')}`);
      }
      return <Array<ENUM>>param;
    }
    if (!Object.keys(allowedEnumValues).includes(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} is required to be one of the following values: ${Object.keys(allowedEnumValues).join(',')}, actual: ${param}`);
    }
    return [<ENUM>param];
  }
}

export const nonNullString = ():ParamReader<string> => {
  return (paramName:string, param:string|string[]|undefined):string => {
    if (param === undefined) {
      throw new InvalidArgumentError(`Param: ${paramName} is required`);
    }
    if (Array.isArray(param)) {
      throw new InvalidArgumentError(`Param: ${paramName} was expected to have a single value, but multiple values have been passed.`);
    }
    return param;
  }
}

export const nullableStringArray = ():ParamReader<string[]|null> => {
  return (paramName:string, param:string|string[]|undefined):string[]|null => {
    if (param === undefined) {
      return null;
    }
    if (Array.isArray(param)) {
      return param;
    }
    return [param];
  }
}

export const optionalStringArray = ():ParamReader<string[]|undefined> => {
  return (paramName:string, param:string|string[]|undefined):string[]|undefined => {
    if (param === undefined) {
      return undefined;
    }
    if (Array.isArray(param)) {
      return param;
    }
    return [param];
  }
}

export const nonNullStringArray = ():ParamReader<string[]> => {
  return (paramName:string, param:string|string[]|undefined):string[] => {
    if (param === undefined) {
      throw new InvalidArgumentError(`Param: ${paramName} is required`);
    }
    if (Array.isArray(param)) {
      return param;
    }
    return [param];
  }
}

export type ParamReader<R> = (paramName:string, param:string|string[]|undefined) => R

export const readParam = <T>(params:QueryString.ParsedQs, paramName:string, paramReader:ParamReader<T>):T => {
  return paramReader(paramName, <string|undefined|string[]>params[paramName]);
}

export const readParams = <T>(params:QueryString.ParsedQs, paramReaders:{[key in keyof T]: ParamReader<T[key]>}):T => {
  const result:any = {};
  Object.entries(paramReaders).forEach(entry => {
    const key:string = entry[0];
    const paramReader:any = entry[1];
    const param:string|undefined|string[] = <string|undefined|string[]>params[key];
    result[key] = paramReader(key, param)
  })
  return <T>result;
}