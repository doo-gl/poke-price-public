import {UserEntity} from "./UserEntity";
import {userRetriever} from "./UserRetriever";
import {appHolder} from "../../infrastructure/AppHolder";
import {flattenArray} from "../../tools/ArrayFlattener";
import {UnexpectedError} from "../../error/UnexpectedError";
import {logger} from "firebase-functions";
import {dedupe} from "../../tools/ArrayDeduper";
import {removeNulls} from "../../tools/ArrayNullRemover";
import {mailchimpMarketing} from "../../external-lib/Mailchimp";
import {itemWatchDeleter} from "../watch/ItemWatchEntity";
import {itemWatchRetriever} from "../watch/ItemWatchRetriever";
import {inventoryItemRetriever} from "../inventory/InventoryItemRetriever";
import {baseInventoryItemDeleter} from "../inventory/InventoryItemEntity";
import {cardOwnershipRetriever} from "../card-ownership/CardOwnershipRetriever";
import {cardOwnershipRepository} from "../card-ownership/CardOwnershipRepository";
import {entityDeleterFactory} from "../../database/EntityDeleterFactory";
import {userSessionRetriever} from "./UserSessionRetriever";
import {userSessionRepository} from "./UserSessionRepository";
import {portfolioStatsRetriever} from "../portfolio/PortfolioStatsRetriever";
import {portfolioStatsDeleter} from "../portfolio/PortfolioStatsEntity";
import {portfolioStatsHistoryRetriever} from "../portfolio/PortfolioStatsHistoryRetriever";
import {portfolioStatsHistoryDeleter} from "../portfolio/PortfolioStatsHistoryEntity";
import {getStripe} from "../../external-lib/Stripe";
import {checkoutSessionRetriever} from "../payment/checkout-session/CheckoutSessionRetriever";
import {baseWebhookEventDeleter, WebhookEventEntity, webhookEventRepository} from "../payment/event/WebhookEventEntity";
import {batchIds, BatchUpdate} from "../../database/BaseCrudRepository";
import {invoiceRetriever} from "../payment/invoice/InvoiceRetriever";
import {baseCheckoutSessionDeleter} from "../payment/checkout-session/CheckoutSessionRepository";
import {baseInvoiceDeleter} from "../payment/invoice/InvoiceRepository";
import {paymentIntentRetriever} from "../payment/payment-intent/PaymentIntentRetriever";
import {basePaymentIntentDeleter} from "../payment/payment-intent/PaymentIntentRepository";
import {emailAttemptRetriever} from "../email/EmailAttemptRetriever";
import {emailAttemptDeleter, EmailAttemptEntity, emailAttemptRepository} from "../email/EmailAttemptEntity";
import {userRepository} from "./UserRepository";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {Update} from "../../database/Entity";

class DeleteContext {
  private entityNameToDeleteCount = new Map<string, number>()
  isDryRun:boolean

  constructor(isDryRun:boolean) {
    this.isDryRun = isDryRun
  }

  addDeletes(entityName:string, deleteCount:number):void {
    const count = this.entityNameToDeleteCount.get(entityName) ?? 0;
    this.entityNameToDeleteCount.set(entityName, count + deleteCount)
  }
  getDeletes():Map<string, number> {
    return this.entityNameToDeleteCount;
  }
}

const deleteFromFirebaseAuth = async (users:Array<UserEntity>, context:DeleteContext):Promise<void> => {
  const firebaseUserIds = flattenArray(
    users
      .filter(user => user.firebaseUserIds && user.firebaseUserIds.length > 0)
      .map(user => user.firebaseUserIds ?? [])
  )
  const firebaseAuth = appHolder.getAdminApp().auth()

  if (context.isDryRun) {
    context.addDeletes('firebase-auth', firebaseUserIds.length)
  } else {
    const deleteResult = await firebaseAuth.deleteUsers(firebaseUserIds)
    context.addDeletes('firebase-auth', deleteResult.successCount)
    if (deleteResult.errors.length > 0) {
      logger.error(`Failed to delete firebase users`, deleteResult.errors)
      throw new UnexpectedError(`Failed to firebase users`)
    }
  }
}

const deleteFromMailchimp = async (users:Array<UserEntity>, context:DeleteContext):Promise<void> => {
  const emails = dedupe(
    removeNulls(
      users
        .filter(user => !!user.details?.email && user.details.email !== '-')
        .map(user => user.details?.email ?? null)
    ),
    i => i
  )
  context.addDeletes('mailchimp-member', emails.length)
  if (!context.isDryRun) {
    await Promise.all(
      emails.map(email => mailchimpMarketing.deleteListMemberPermanently(email))
    )
  }
}

const deleteWebhookEvents = async (eventObjectIds:Array<string>, context:DeleteContext):Promise<void> => {
  const idBatches:Array<Array<string>> = batchIds(eventObjectIds)
  const resultBatches:Array<Array<WebhookEventEntity>> = await Promise.all(
    idBatches.map((idBatch) => webhookEventRepository.getMany([{ field: "eventObjectId", operation: "in", value: idBatch }])),
  );
  const events = flattenArray(resultBatches);
  context.addDeletes('webhook-event', events.length)
  if (!context.isDryRun) {
    await baseWebhookEventDeleter.batchDelete(events.map(event => event.id))
  }
}

const deleteFromStripeForUser = async (user:UserEntity, context:DeleteContext):Promise<void> => {
  const stripeCustomerId = user.stripeDetails?.stripeId ?? null;
  if (!stripeCustomerId) {
    return;
  }
  context.addDeletes('stripe-customer', 1)
  if (!context.isDryRun) {
    await getStripe().customers?.del(stripeCustomerId)
  }


  const checkoutSessions = await checkoutSessionRetriever.retrieveByStripeCustomerId(stripeCustomerId)
  await deleteWebhookEvents(checkoutSessions.map(entity => entity.stripeCheckoutSessionId), context)
  context.addDeletes('stripe-checkout-session', checkoutSessions.length)
  if (!context.isDryRun) {
    await baseCheckoutSessionDeleter.batchDelete(checkoutSessions.map(entity => entity.id))
  }

  const invoices = await invoiceRetriever.retrieveByStripeCustomerId(stripeCustomerId)
  await deleteWebhookEvents(invoices.map(entity => entity.stripeInvoiceId), context)
  context.addDeletes('stripe-invoice', invoices.length)
  if (!context.isDryRun) {
    await baseInvoiceDeleter.batchDelete(invoices.map(entity => entity.id))
  }

  const paymentIntents = await paymentIntentRetriever.retrieveByStripeCustomerId(stripeCustomerId)
  await deleteWebhookEvents(paymentIntents.map(entity => entity.stripePaymentIntentId), context)
  context.addDeletes('stripe-payment-intent', paymentIntents.length)
  if (!context.isDryRun) {
    await basePaymentIntentDeleter.batchDelete(paymentIntents.map(entity => entity.id))
  }
}

const deleteItemWatchesForUser = async (user:UserEntity, context:DeleteContext):Promise<void> => {
  const entities = await itemWatchRetriever.retrieveByUserId(user.id)
  context.addDeletes('item-watch', entities.length)
  if (!context.isDryRun) {
    await itemWatchDeleter.batchDelete(entities.map(entity => entity.id))
  }
}

const deleteInventoryForUser = async (user:UserEntity, context:DeleteContext):Promise<void> => {
  const entities = await inventoryItemRetriever.retrieveByUserId(user.id)
  context.addDeletes('inventory-item', entities.length)
  if (!context.isDryRun) {
    await baseInventoryItemDeleter.batchDelete(entities.map(entity => entity.id))
  }
}

const deleteOwnershipsForUser = async (user:UserEntity, context:DeleteContext):Promise<void> => {
  const entities = await cardOwnershipRetriever.retrieveByUserId(user.id)
  context.addDeletes('card-ownership', entities.length)
  if (!context.isDryRun) {
    await entityDeleterFactory.batchDelete(cardOwnershipRepository, entities.map(entity => entity.id))
  }
}

const deleteSessionsForUser = async (user:UserEntity, context:DeleteContext):Promise<void> => {
  const entities = await userSessionRetriever.retrieveByUserId(user.id)
  context.addDeletes('user-session', entities.length)
  if (!context.isDryRun) {
    await entityDeleterFactory.batchDelete(userSessionRepository, entities.map(entity => entity.id))
  }
}

const deletePortfolioStatsForUser = async (user:UserEntity, context:DeleteContext):Promise<void> => {
  const entity = await portfolioStatsRetriever.retrieveByUserId(user.id)
  if (entity) {
    context.addDeletes('portfolio-stats', 1)
    if (!context.isDryRun) {
      await portfolioStatsDeleter.delete(entity.id)
    }
  }
  const entities = await portfolioStatsHistoryRetriever.retrieveByUserId(user.id)
  context.addDeletes('portfolio-stats-history', entities.length)
  if (!context.isDryRun) {
    await portfolioStatsHistoryDeleter.batchDelete(entities.map(ent => ent.id))
  }

}

const deleteEmailAttemptsForUser = async (user:UserEntity, context:DeleteContext):Promise<void> => {
  const userEmail = user.details?.email;
  if (!userEmail) {
    return;
  }
  const entities = await emailAttemptRetriever.retrieveByToUserId(user.id)
  context.addDeletes('email-attempt', entities.length)
  if (!context.isDryRun) {

    const entitiesToDelete = entities.filter(entity => entity.toUserIds.length === 1)
    await emailAttemptDeleter.batchDelete(entitiesToDelete.map(entity => entity.id))

    const entitiesToUpdate = entities.filter(entity => entity.toUserIds.length !== 1)
    const updates:Array<BatchUpdate<EmailAttemptEntity>> = [];
    entitiesToUpdate.forEach(entity => {
      const update:Update<EmailAttemptEntity> = {
        toUserIds: entity.toUserIds.filter(userId => userId !== user.id),
        request: {
          ...entity.request,
          message: {
            ...entity.request.message,
            to: entity.request.message.to.filter(recipient => recipient.userId !== user.id),
          },
        },
        response: entity.response?.filter(response => response.email !== userEmail),
      }
      updates.push({id: entity.id, update})
    })
    await emailAttemptRepository.batchUpdate(updates)

  }
}

const deleteUsersFromFirestore = async (users:Array<UserEntity>, context:DeleteContext):Promise<void> => {
  context.addDeletes('user', users.length)
  if (!context.isDryRun) {
    await entityDeleterFactory.batchDelete(userRepository, users.map(user => user.id))
  }
}

const logResult = (context:DeleteContext) => {
  const entityNameToDeleteCount = context.getDeletes();
  const entries = [...entityNameToDeleteCount.entries()]
    .sort(comparatorBuilder.objectAttributeASC(value => value[0]))
  let total = 0;
  logger.info(`GDPR Delete Result${context.isDryRun ? ' - DRY RUN': ''}`)
  entries.forEach(entry => {
    const entityName = entry[0];
    const deleteCount = entry[1];
    total += deleteCount;
    logger.info(`${entityName}: ${deleteCount} deletes`)
  })
  logger.info(`total: ${total} deletes`)
}

const deleteUser = async (user:UserEntity, dryRun:boolean):Promise<void> => {
  const allUsers = await userRetriever.retrieveAllConnectedUsers(user.id)
  const context = new DeleteContext(dryRun)
  logger.info(`GDPR Delete Request${context.isDryRun ? ' - DRY RUN': ''}`)


  await deleteFromMailchimp(allUsers, context)
  await Promise.all(allUsers.map(usr => deleteFromStripeForUser(usr, context)))
  await Promise.all(allUsers.map(usr => deleteItemWatchesForUser(usr, context)))
  await Promise.all(allUsers.map(usr => deleteInventoryForUser(usr, context)))
  await Promise.all(allUsers.map(usr => deleteOwnershipsForUser(usr, context)))
  await Promise.all(allUsers.map(usr => deleteSessionsForUser(usr, context)))
  await Promise.all(allUsers.map(usr => deletePortfolioStatsForUser(usr, context)))
  await Promise.all(allUsers.map(usr => deleteEmailAttemptsForUser(usr, context)))

  await deleteFromFirebaseAuth(allUsers, context)
  await deleteUsersFromFirestore(allUsers, context)

  logResult(context)
}

export const userGdprDeletionRequestProcessor = {
  deleteUser,
}