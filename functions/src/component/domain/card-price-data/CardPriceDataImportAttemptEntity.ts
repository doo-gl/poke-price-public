import {StatefulEntity} from "../../database/StatefulEntity";
import {LoadingState} from "../../constants/LoadingState";
import {Entity} from "../../database/Entity";
import {build, StatefulEntityUpdater} from "../../database/StatefulEntityUpdater";
import {cardPriceDataImportAttemptRepository} from "./CardPriceDataImportAttemptRepository";
import {UnexpectedError} from "../../error/UnexpectedError";

export const attemptStateUpdater:StatefulEntityUpdater<CardPriceDataImportAttemptEntity> =
  build<CardPriceDataImportAttemptEntity>(cardPriceDataImportAttemptRepository);

export const SUB_STATE:{[key in LoadingState]: {[k:string]:string}} = {
    NOT_STARTED: { CREATED: 'CREATED' },
    IN_PROGRESS: { STARTED: 'STARTED' },
    SUCCESSFUL: { FINISHED: 'FINISHED' },
    FAILED: { ERRORED: 'ERRORED', TIMED_OUT: 'TIMED_OUT', CHILD_ERRORED: 'CHILD_ERRORED' },
}

export enum ImportType {
    TCG_PLAYER_MARKET_DATA = 'TCG_PLAYER_MARKET_DATA',
    EBAY_SINGLE_CARD_SOLD_LISTINGS = 'EBAY_SINGLE_CARD_SOLD_LISTINGS',
    EBAY_SET_SOLD_LISTINGS = 'EBAY_SET_SOLD_LISTINGS',
}

export type TcgPlayerImportData = {
    setId:string,
}

export type EbaySingleCardImportData = {
    cardId:string,
    setImportId:string,
    series:string,
    set:string,
    numberInSet:string,
}

export type EbaySetImportData = {
    series:string,
    set:string,
}

export type ImportData = TcgPlayerImportData|EbaySingleCardImportData|EbaySetImportData;

const extractImportData = <T extends ImportData>(attempt:CardPriceDataImportAttemptEntity, importType:ImportType):T => {
    if (attempt.importType !== importType) {
        throw new UnexpectedError(`Trying to extract ${importType} data from attempt with type: ${attempt.importType}`);
    }
    return <T>attempt.importData;
}

export const extractEbaySetImportData = (attempt:CardPriceDataImportAttemptEntity):EbaySetImportData => {
    return extractImportData(attempt, ImportType.EBAY_SET_SOLD_LISTINGS);
}
export const extractEbaySingleCardImportData = (attempt:CardPriceDataImportAttemptEntity):EbaySingleCardImportData => {
    return extractImportData(attempt, ImportType.EBAY_SINGLE_CARD_SOLD_LISTINGS);
}
export const extractTcgMarketImportData = (attempt:CardPriceDataImportAttemptEntity):TcgPlayerImportData => {
    return extractImportData(attempt, ImportType.TCG_PLAYER_MARKET_DATA);
}

export type CardPriceDataImport = Omit<CardPriceDataImportAttemptEntity, keyof StatefulEntity>;

export type CreateCardPriceDataImportAttemptEntity = Omit<CardPriceDataImportAttemptEntity, keyof Entity>;

export interface CardPriceDataImportAttemptEntity extends StatefulEntity {
    importType:ImportType,
    importData:ImportData,
    parentImportId:string|null,
}