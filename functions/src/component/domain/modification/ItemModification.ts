import {JSONSchemaType} from "ajv";


export interface ItemModification {
  name:string,
  key:string,
  type:string,
  details:any,
}

export const GRADING_MODIFICATION_TYPE = 'grading'
export const RAW_MODIFICATION_KEY = "RAW"

export interface GradingModificationDetails {
  graderName:string,
  graderKey:string,
  grade:string,
}

export const gradingModificationDetailsSchema:JSONSchemaType<GradingModificationDetails> = {
  type: "object",
  properties: {
    graderName: { type: "string" },
    graderKey: { type: "string" },
    grade: { type: "string" },
  },
  additionalProperties: false,
  required: ["graderName", "graderKey", "grade"],
}

export const toGradingDetails = (value:any):GradingModificationDetails|null => {
  if (
    value && value.graderName && value.graderKey && value.grade
    && typeof value.graderName === "string"
    && typeof value.graderKey === "string"
    && typeof value.grade === "string"
  ) {
    return value
  } else {
    return null
  }
}