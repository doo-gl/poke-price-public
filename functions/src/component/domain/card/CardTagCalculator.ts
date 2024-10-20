import {convertToKey} from "../../tools/KeyConverter";


const calculateFromQueryDetails = (queryDetails:{[name:string]:string}):{[name:string]:string} => {

  const tags:{[name:string]:string} = {};
  Object.values(queryDetails).forEach(value => {
    const tag = convertToKey(value)
    if (!value || value.length === 0 || !tag || tag.length === 0) {
      return;
    }
    tags[tag] = tag;
  })
  return tags;
}

export const cardTagCalculator = {
  calculateFromQueryDetails,
}