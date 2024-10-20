import {configRetriever} from "../infrastructure/ConfigRetriever";
import md5 from 'md5';
import {logger} from "firebase-functions";
import {Status} from "@mailchimp/mailchimp_marketing";
import {isProduction} from "../infrastructure/ProductionDecider";


const config = configRetriever.retrieve()
/*
Mailchimp disabled to save money - we weren't getting much use out of it
 */

// const MailchimpTransactional = require("@mailchimp/mailchimp_transactional/src/index.js");
// export const mailchimpTransactional = MailchimpTransactional(config.mailchimpTransactionalApiKey());
//
// const POKE_PRICE_MAILCHIMP_LIST_ID = ''
// const MailchimpMarketing = require("@mailchimp/mailchimp_marketing/src/index.js");
// MailchimpMarketing.setConfig({
//   apiKey: config.mailchimpMarketingApiKey(),
//   server: 'us1',
// })

// https://mailchimp.com/developer/marketing/api/ping/ping/
const ping = async () => {
  // return MailchimpMarketing.ping.get()
}

export interface MailchimpListMember {
  id:string,
  email:string,
  status:'subscribed'|'unsubscribed'|'cleaned'|'pending'|'transactional'|'archived'
}
// https://mailchimp.com/developer/marketing/api/list-members/get-member-info/
const getListMember = async (email:string):Promise<MailchimpListMember|null> => {
  // const hash = md5(email.toLowerCase())
  // try {
  //   return await MailchimpMarketing.lists.getListMember(POKE_PRICE_MAILCHIMP_LIST_ID, hash)
  // } catch (err:any) {
  //   if (err.status === 404) {
  //     return null
  //   }
  //   logger.error('Failed to fetch user from mailchimp', err)
  //   throw err
  // }
  return null
}

const addListMember = async (email:string):Promise<void> => {
  // if (!isProduction()) {
  //   logger.warn("Not going to add email to mailchimp - not production")
  //   return
  // }
  // try {
  //   logger.info("Adding email to mailchimp")
  //   return await MailchimpMarketing.lists.addListMember(POKE_PRICE_MAILCHIMP_LIST_ID, {
  //     email_address: email,
  //     status: 'subscribed',
  //   })
  // } catch (err:any) {
  //   logger.error('Failed to create user in mailchimp', err)
  //   throw err
  // }
}

const deleteListMemberPermanently = async (email:string):Promise<void> => {
  // if (!isProduction()) {
  //   return
  // }
  // try {
  //   const hash = md5(email.toLowerCase())
  //   await MailchimpMarketing.lists.deleteListMemberPermanent(
  //     POKE_PRICE_MAILCHIMP_LIST_ID,
  //     hash,
  //   )
  // } catch (err:any) {
  //   logger.error('Failed to delete user in mailchimp', err)
  //   throw err
  // }
}

const sendListMemberEvent = async (email:string, eventName:string, event:any):Promise<void> => {
  // if (!isProduction()) {
  //   return
  // }
  // try {
  //   const hash = md5(email.toLowerCase())
  //   return await MailchimpMarketing.lists.createListMemberEvent(
  //     POKE_PRICE_MAILCHIMP_LIST_ID,
  //     hash,
  //     {
  //       name: eventName,
  //       properties: event,
  //     }
  //   )
  // } catch (err:any) {
  //   logger.error('Failed to create user in mailchimp', err)
  //   throw err
  // }
}

export const mailchimpMarketing = {
  ping,
  getListMember,
  addListMember,
  sendListMemberEvent,
  deleteListMemberPermanently,
}


