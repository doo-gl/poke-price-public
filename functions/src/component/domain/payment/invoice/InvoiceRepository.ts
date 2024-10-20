import {repositoryFactory} from "../../../database/RepositoryFactory";
import {InvoiceEntity} from "./InvoiceEntity";


const COLLECTION_NAME = 'stripe-invoice'

const result = repositoryFactory.build<InvoiceEntity>(COLLECTION_NAME);

export const invoiceSessionRepository = result.repository;
export const baseInvoiceCreator = result.creator;
export const baseInvoiceUpdater = result.updater;
export const baseInvoiceDeleter = result.deleter;