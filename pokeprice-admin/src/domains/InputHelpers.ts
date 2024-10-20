import {convertToKey, convertToSlug} from "../common/KeyConverter";
import {regex} from "react-admin";

export const parseKey = (input:string) => {
  if (input.endsWith('-')) {
    return input
  }
  return convertToKey(input)
}

export const parseSlug = (input:string) => {
  if (input.endsWith('-')) {
    return input
  }
  return convertToSlug(input)
}

export const validateImageUrl = regex(/(https?:\/\/.*\.(?:png|jpg|jpeg|webp))/i, 'Must be an image url')
export const validateUuid = regex(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i, 'Must be a UUID')