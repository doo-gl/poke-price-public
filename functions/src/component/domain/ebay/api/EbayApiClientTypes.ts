
export enum EbaySite {
  EBAY_US = 'EBAY_US',
  EBAY_GB = 'EBAY_GB',
}

export interface EbayCategory {
  categoryId:string,
  categoryName:string,
}

export interface EbayImage {
  imageUrl:string
}

export interface EbayCurrencyAmount {
  value:string, // value in major units
  currency:string,
}

export enum EbayTimeDurationUnit {
  YEAR = 'YEAR',
  MONTH = 'MONTH',
  DAY = 'DAY',
  HOUR = 'HOUR',
  CALENDAR_DAY = 'CALENDAR_DAY',
  BUSINESS_DAY = 'BUSINESS_DAY',
  MINUTE = 'MINUTE',
  SECOND = 'SECOND',
  MILLISECOND = 'MILLISECOND',
}
export interface EbayTimeDuration {
  value:number,
  unit:EbayTimeDurationUnit,
}

export interface EbaySeller {
  username:string,
  feedbackPercentage:string,
  feedbackScore:string,
}

export enum EbayShippingCostType {
  FIXED = 'FIXED',
  CALCULATED = 'CALCULATED',
}
export interface EbayShippingOption {
  shippingCostType:EbayShippingCostType,
  shippingCost?:EbayCurrencyAmount,
  shippingServiceCode?:string,
  shippingCarrierCode?:string,
  type?:string,
  quantityUsedForEstimate?:number,
  minEstimatedDeliveryDate?:string, //YYYY-MM-DDTHH:mm:ss.SSSZ
  maxEstimatedDeliveryDate?:string, //YYYY-MM-DDTHH:mm:ss.SSSZ
}

export enum EbayShipToRegionType {
  COUNTRY_REGION = 'COUNTRY_REGION',
  STATE_OR_PROVINCE = 'STATE_OR_PROVINCE',
  COUNTRY = 'COUNTRY',
  WORLD_REGION = 'WORLD_REGION',
  WORLDWIDE = 'WORLDWIDE',
}
export interface EbayShipToRegion {
  regionId:string,
  regionName:string,
  regionType:EbayShipToRegionType,
}
export interface EbayShipToLocation {
  regionIncluded:Array<EbayShipToRegion>,
  regionExcluded:Array<EbayShipToRegion>,
}

export enum EbayRefundMethod {
  MONEY_BACK = 'MONEY_BACK',
  MERCHANDISE_CREDIT = 'MERCHANDISE_CREDIT',
}
export enum EbayReturnMethod {
  REPLACEMENT = 'REPLACEMENT',
  EXCHANGE = 'EXCHANGE',
}
export enum EbayReturnCostPayer {
  SELLER = 'SELLER',
  BUYER = 'BUYER',
}
export interface EbayReturnTerms {
  returnsAccepted:boolean,
  refundMethod:EbayRefundMethod,
  returnShippingCostPayer:EbayReturnCostPayer,
  returnPeriod:EbayTimeDuration,
  returnMethod?:EbayReturnMethod,
}

export enum EbayTaxRegionType {
  COUNTRY = 'COUNTRY',
  STATE_OR_PROVINCE = 'STATE_OR_PROVINCE'
}
export interface EbayTaxRegion {
  regionName:string,
  regionType:EbayTaxRegionType,
}
export interface EbayTaxJurisdiction {
  taxJurisdictionId:string,
  region:EbayTaxRegion
}
export enum EbayTaxType {
  STATE_SALES_TAX = 'STATE_SALES_TAX',
  VAT = 'VAT',
  PROVINCE_SALES_TAX = 'PROVINCE_SALES_TAX',
  REGION = 'REGION',
  GST = 'GST',
}
export interface EbayTaxes {
  taxJurisdiction:EbayTaxJurisdiction,
  taxType:EbayTaxType,
  shippingAndHandlingTaxed:boolean,
  includedInPrice:boolean,
  ebayCollectAndRemitTax:boolean,
}

export enum EbayBuyingOption {
  FIXED_PRICE = 'FIXED_PRICE',
  BEST_OFFER = 'BEST_OFFER',
  AUCTION = 'AUCTION',
}

export enum EbayValueTypeEnum {
  STRING = 'STRING',
  STRING_ARRAY = 'STRING_ARRAY'
}
export interface EbayTypedNameValue {
  name:string,
  value:string,
  type:EbayValueTypeEnum,
}

export enum EbayPaymentMethodType {
  CREDIT_CARD = 'CREDIT_CARD',
  WALLET = 'WALLET',
  DEBIT_CARD = 'DEBIT_CARD',
  CREDIT = 'CREDIT',
  BANK = 'BANK',
  CASH = 'CASH',
  OTHER = 'OTHER',
  CHECK = 'CHECK',
  MONEY_ORDER = 'MONEY_ORDER',
  WIRE_TRANSFER = 'WIRE_TRANSFER',
  DEFERRED = 'DEFERRED',
}
export enum EbayPaymentMethodBrandType {
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  DISCOVER = 'DISCOVER',
  AMERICAN_EXPRESS = 'AMERICAN_EXPRESS',
  CB_NATIONALE = 'CB_NATIONALE',
  CETELEM = 'CETELEM',
  COFIDIS = 'COFIDIS',
  COFINOGA = 'COFINOGA',
  MAESTRO = 'MAESTRO',
  SWITCH = 'SWITCH',
  POSTEPAY = 'POSTEPAY',
  CB = 'CB',
  DINERS_CLUB = 'DINERS_CLUB',
  UNION_PAY = 'UNION_PAY',
  PAYPAL_CREDIT = 'PAYPAL_CREDIT',
  PAYPAL = 'PAYPAL',
  GOOGLE_PAY = 'GOOGLE_PAY',
  APPLE_PAY = 'APPLE_PAY',
  QIWI = 'QIWI',
}
export enum EbayPaymentInstruction {
  DIRECT_DEBIT = 'DIRECT_DEBIT',
  ACH = 'ACH',
  EFT = 'EFT',
  CIP = 'CIP',
  MONEY_TRANSFER = 'MONEY_TRANSFER',
  CASH_IN_PERSON = 'CASH_IN_PERSON',
  CASH_ON_PICKUP = 'CASH_ON_PICKUP',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  CONTACT_SELLER = 'CONTACT_SELLER',
  PAY_UPON_INVOICE = 'PAY_UPON_INVOICE',
}
export enum EbaySellerInstruction {
  ACCEPTS_CREDIT_CARD = 'ACCEPTS_CREDIT_CARD',
  SEE_DESCRIPTION = 'SEE_DESCRIPTION',
}
export interface EbayPaymentMethodBrand {
  paymentMethodBrandType:EbayPaymentMethodBrandType,
  logoImage:EbayImage,
}
export interface EbayPaymentMethod {
  paymentMethodType:EbayPaymentMethodType,
  paymentMethodBrands:Array<EbayPaymentMethodBrand>,
  paymentInstructions?:Array<EbayPaymentInstruction>,
  sellerInstructions?:Array<EbaySellerInstruction>,
}

export enum EbayItemGroupType {
  SELLER_DEFINED_VARIATIONS = 'SELLER_DEFINED_VARIATIONS'
}
export interface EbayItemGroupSummary {
  itemGroupAdditionalImages:Array<EbayImage>,
  itemGroupHref:string,
  itemGroupId:string,
  itemGroupImage:EbayImage,
  itemGroupTitle:string,
  itemGroupType:EbayItemGroupType,
}

export interface EbayLocation {
  postalCode:string,
  country:string,
  city?:string,
  stateOrProvince?:string,
}

export enum EbayDeliveryOption {
  SHIP_TO_HOME = 'SHIP_TO_HOME',
  SELLER_ARRANGED_LOCAL_PICKUP = 'SELLER_ARRANGED_LOCAL_PICKUP',
  IN_STORE_PICKUP = 'IN_STORE_PICKUP',
  PICKUP_DROP_OFF = 'PICKUP_DROP_OFF',
  DIGITAL_DELIVERY = 'DIGITAL_DELIVERY',
}
export enum EbayEstimatedAvailabilityStatus {
  IN_STOCK = 'IN_STOCK',
  LIMITED_STOCK = 'LIMITED_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK'
}
export interface EbayEstimatedAvailability {
  deliveryOptions:Array<EbayDeliveryOption>,
  estimatedAvailabilityStatus:EbayEstimatedAvailabilityStatus,
  estimatedAvailableQuantity:number,
  estimatedSoldQuantity:number,
}

export interface EbayAppRateLimitRate {
  limit:number,
  remaining:number,
  reset:string, //YYYY-MM-DDTHH:mm:ss.SSSZ
  timeWindow:number,
}

export interface EbayAppRateLimitResource {
  name:string,
  rates:Array<EbayAppRateLimitRate>,
}

export interface EbayAppRateLimit {
  apiContext:string,
  apiName:string,
  apiVersion:string,
  resources:Array<EbayAppRateLimitResource>
}

export interface EbayAppRateLimitResponse {
  rateLimits:Array<EbayAppRateLimit>
}

export const isEbayId = (id:string):boolean => {
  return !!id.match("^v1\\|[\\d]+\\|[\\d]+$")
}

export const toEbayId = (id:string):string => {
  if (isEbayId(id)) {
    return id
  }
  return `v1|${id}|0`
}