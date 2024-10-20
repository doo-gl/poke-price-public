import {Stripe} from "stripe";
import {Create} from "../../../database/Entity";
import {invoiceRetriever} from "../invoice/InvoiceRetriever";
import {baseInvoiceCreator, baseInvoiceUpdater} from "../invoice/InvoiceRepository";
import {InvoiceEntity} from "../invoice/InvoiceEntity";
import {extractId} from "../StripeIdExtractor";
import {removeNulls} from "../../../tools/ArrayNullRemover";
import {logger} from "firebase-functions";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {TimestampStatic} from "../../../external-lib/Firebase";


const upsert = async (event:Stripe.Event, invoice:Stripe.Invoice):Promise<void> => {

  const create:Create<InvoiceEntity> = {
    stripeInvoiceId: invoice.id,
    mostRecentEventTimestamp: TimestampStatic.fromMillis(event.created * 1000),
    accountCountry: invoice.account_country,
    accountName: invoice.account_name,
    accountTaxIds: invoice.account_tax_ids ?
      removeNulls(invoice.account_tax_ids.map(value => extractId(value)))
      : null,
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    amountRemaining: invoice.amount_remaining,
    applicationFeeAmount: invoice.application_fee_amount,
    attemptCount: invoice.attempt_count,
    attempted: invoice.attempted,
    autoAdvance: invoice.auto_advance ?? null,
    automaticTax: invoice.automatic_tax,
    billingReason: invoice.billing_reason,
    chargeId: extractId(invoice.charge),
    collectionMethod: invoice.collection_method,
    created: TimestampStatic.fromMillis(invoice.created * 1000),
    customFields: invoice.custom_fields,
    customerId: extractId(invoice.customer),
    customerAddress: invoice.customer_address,
    customerEmail: invoice.customer_email,
    customerName: invoice.customer_name,
    customerPhone: invoice.customer_phone,
    customerShipping: invoice.customer_shipping,
    customerTaxExempt: invoice.customer_tax_exempt,
    customerTaxIds: invoice.customer_tax_ids ?? null,
    defaultPaymentMethodId: extractId(invoice.default_payment_method),
    defaultSourceId: extractId(invoice.default_source),
    defaultTaxRates: invoice.default_tax_rates,
    description: invoice.description,
    discount: invoice.discount,
    discountIds: invoice.discounts
      ? removeNulls(invoice.discounts.map(value => extractId(value)))
      : null,
    dueDate: invoice.due_date ? TimestampStatic.fromMillis(invoice.due_date * 1000) : null,
    endingBalance: invoice.ending_balance,
    footer: invoice.footer,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdf: invoice.invoice_pdf ?? null,
    lastFinalizationError: invoice.last_finalization_error,
    lines: invoice.lines.data,
    nextPaymentAttempt: invoice.next_payment_attempt ? TimestampStatic.fromMillis(invoice.next_payment_attempt * 1000) : null,
    number: invoice.number,
    onBehalfOfAccountId: extractId(invoice.on_behalf_of),
    paid: invoice.paid,
    paymentIntentId: extractId(invoice.payment_intent),
    paymentSettings: invoice.payment_settings,
    periodEnd: invoice.period_end ? TimestampStatic.fromMillis(invoice.period_end * 1000) : null,
    periodStart: invoice.period_start ? TimestampStatic.fromMillis(invoice.period_start * 1000) : null,
    postPaymentCreditNotesAmount: invoice.post_payment_credit_notes_amount,
    prePaymentCreditNotesAmount: invoice.pre_payment_credit_notes_amount,
    receiptNumber: invoice.receipt_number,
    startingBalance: invoice.starting_balance,
    statementDescriptor: invoice.statement_descriptor,
    status: invoice.status,
    statusTransitions: invoice.status_transitions,
    subscriptionId: extractId(invoice.subscription),
    subscriptionProrationDate: invoice.subscription_proration_date ? TimestampStatic.fromMillis(invoice.subscription_proration_date * 1000) : null,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    thresholdReason: invoice.threshold_reason ?? null,
    total: invoice.total,
    totalDiscountAmounts: invoice.total_discount_amounts,
    totalTaxAmounts: invoice.total_tax_amounts,
    transferData: invoice.transfer_data,
    webhooksDeliveredAt: invoice.webhooks_delivered_at ? TimestampStatic.fromMillis(invoice.webhooks_delivered_at * 1000) : null,
    metadata: invoice.metadata,
    rawEvent: invoice,
  }

  const preExistingEntity = await invoiceRetriever.retrieveOptionalByStripeInvoiceId(invoice.id);
  if (!preExistingEntity) {
    await baseInvoiceCreator.create(create);
  } else {
    const lastUpdate = timestampToMoment(preExistingEntity.mostRecentEventTimestamp)
    const currentUpdate = timestampToMoment(create.mostRecentEventTimestamp)
    if (lastUpdate.isSameOrAfter(currentUpdate)) {
      logger.info(`Skipping invoice update with id: ${preExistingEntity.id}, ${lastUpdate.toISOString()} >= ${currentUpdate.toISOString()}`)
      return;
    }
    await baseInvoiceUpdater.merge(preExistingEntity.id, create)
  }
}

export const webhookInvoiceUpserter = {
  upsert,
}