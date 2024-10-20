import {Stripe} from "stripe";
import {userRetriever} from "../../user/UserRetriever";
import {InvalidArgumentError} from "../../../error/InvalidArgumentError";
import {getStripe} from "../../../external-lib/Stripe";
import {userUpdater} from "../../user/UserRepository";
import {UserEntity} from "../../user/UserEntity";
import {STRIPE_METADATA_USER_ID_KEY} from "../checkout-session/CheckoutSessionStarter";

const sourceCustomerFromEmail = async (email:string):Promise<Stripe.Customer> => {
  const preExistingCustomers = await getStripe().customers.list({ email });
  // customers are returned in date created DESC
  // use the most recent customer for this email
  // as this is assumed to be the most up to date
  const preExistingCustomer = preExistingCustomers.data.length > 0
    ? preExistingCustomers.data[0]
    : null;
  if (preExistingCustomer) {
    return preExistingCustomer
  }
  const customer = await getStripe().customers.create({email})
  return customer;
}

const sourceCustomer = async (user:UserEntity):Promise<Stripe.Customer> => {
  if (!user.details?.email) {
    throw new InvalidArgumentError(`User with id: ${user.id} does not have an email`);
  }

  const email = user.details.email

  if (user.stripeDetails?.stripeId) {
    const preExistingCustomer = await getStripe().customers.retrieve(user.stripeDetails.stripeId)
    if (preExistingCustomer.deleted) {
      return await sourceCustomerFromEmail(email)
    } else {
      return preExistingCustomer
    }
  }
  return await sourceCustomerFromEmail(email)
}

const getOrInsertCustomerFromUser = async (user:UserEntity):Promise<Stripe.Customer> => {

  const customer = await sourceCustomer(user);

  if (!user.stripeDetails || user.stripeDetails.stripeId !== customer.id) {
    const stripeId = customer.id;
    const stripeLink = `https://dashboard.stripe.com${customer.livemode ? '' : '/test'}/customers/${customer.id}`
    await userUpdater.update(user.id, {
      stripeDetails: {
        stripeId,
        stripeLink,
      },
    })
  }

  if (!customer.metadata || !customer.metadata[STRIPE_METADATA_USER_ID_KEY] || customer.metadata[STRIPE_METADATA_USER_ID_KEY] !== user.id) {
    const metadata = customer.metadata ?? {};
    metadata[STRIPE_METADATA_USER_ID_KEY] = user.id;
    await getStripe().customers.update(customer.id, { metadata })
  }

  return customer;
}

const getOrInsertCustomerIdFromUser = async (user:UserEntity):Promise<string> => {
  if (!user.details?.email) {
    throw new InvalidArgumentError(`User with id: ${user.id} does not have an email`);
  }
  if (user.stripeDetails?.stripeId) {
    return user.stripeDetails.stripeId
  }
  return (await getOrInsertCustomerFromUser(user)).id
}

const getOrInsertCustomerId = async (userId:string):Promise<string> => {
  const user = await userRetriever.retrieve(userId);
  return getOrInsertCustomerIdFromUser(user)
}

export const customerGetserter = {
  getOrInsertCustomerFromUser,
  getOrInsertCustomerIdFromUser,
  getOrInsertCustomerId,
}