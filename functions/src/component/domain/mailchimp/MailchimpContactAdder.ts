import {UserEntity} from "../user/UserEntity";
import {MailchimpListMember, mailchimpMarketing} from "../../external-lib/Mailchimp";
import {logger} from "firebase-functions";


const addContact = async (user:UserEntity):Promise<void> => {
  const email = user.details?.email
  if (!email || !email.includes('@')) {
    return;
  }
  try {
    const listMemberResult = await mailchimpMarketing.getListMember(email)
    if (listMemberResult) {
      return
    }
    const addMemberResult = await mailchimpMarketing.addListMember(email)
  } catch (err:any) {
    logger.error(`Failed to add user: ${user.id} to mailchimp`, err)
  }

}

const getOrAddContact = async (user:UserEntity):Promise<MailchimpListMember|null> => {
  const email = user.details?.email
  if (!email || !email.includes('@')) {
    return null
  }
  const listMemberResult = await mailchimpMarketing.getListMember(email)
  if (listMemberResult) {
    return listMemberResult
  } else {
    await addContact(user)
  }
  return await mailchimpMarketing.getListMember(email)
}

export const mailchimpContactAdder = {
  addContact,
  getOrAddContact,
}