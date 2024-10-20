import {appHolder} from "../infrastructure/AppHolder";
import {Firestore} from "../external-lib/Firebase";

let pokePriceFirestore:Firestore|null = null;

const init = ():Firestore => {
  pokePriceFirestore = appHolder.getAdminApp().firestore();
  return pokePriceFirestore
}

const get = ():Firestore => {
  if (!pokePriceFirestore) {
    return init();
  }
  return pokePriceFirestore;
}

export const firestoreHolder = {
  get,
}