import {Timestamp} from "../../external-lib/Firebase";


export type TemplateVariables = {[name:string]:string}
export type TemplateMetadata = {[name:string]:any}

export interface Template<T extends TemplateVariables, M extends TemplateMetadata> {
  name:string,
  subject:string,
  variables:T
  metadata:M
}

export interface WelcomeVariables extends TemplateVariables {
  FOO_1:string,
  FOO_2:string,
  FOO_3:string,
}

export interface WelcomeMetadata extends TemplateMetadata {
  userId:string
}

export interface WelcomeTemplate extends Template<WelcomeVariables, WelcomeMetadata> {
  name:'Welcome Email',
}

export interface PortfolioUpdateVariables extends TemplateVariables {
  PORTFOLIO_SIZE:string,
  PORTFOLIO_SIZE_CHANGE:string,
  PORTFOLIO_VALUE:string,
  PORTFOLIO_VALUE_CHANGE:string,
  TOP_COLLECTION_HTML:string
}

export interface PortfolioUpdateMetadata extends TemplateMetadata {
  userId:string,
  timestamp:Timestamp,
  fromPortfolioStatsHistoryId:string|null,
  toPortfolioStatsHistoryId:string,
}

export interface PortfolioUpdateTemplate extends Template<PortfolioUpdateVariables, PortfolioUpdateMetadata> {
  name: 'Portfolio Update',
  subject: 'Your Portfolio Stats Update from pokeprice.io'
}
export const PORTFOLIO_UPDATE_EMAIL_TEMPLATE_NAME = 'Portfolio Update'



export interface StandardEmptyTemplateVariables extends TemplateVariables {
  TEMPLATE_BODY_HTML:string
}
export type StandardEmptyTemplateMetadata = TemplateMetadata
export type StandardEmptyTemplate = Template<StandardEmptyTemplateVariables, StandardEmptyTemplateMetadata>
export const STANDARD_EMPTY_TEMPLATE_EMAIL_TEMPLATE_NAME = 'Standard Empty Template';