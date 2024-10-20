
import {Parser} from 'json2csv';

const parse = (data:object|object[]):string => {
  const parser = new Parser<object>();
  return parser.parse(data)
}

export const jsonToCsv = {
  parse,
}