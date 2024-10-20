import {jsonToCsv} from "../../../../external-lib/JsonToCsv";
import {tempKeywordUrlRepository} from "./TempKeywordUrlRepository";
import {TempKeywordUrlEntity} from "./TempKeywordUrlEntity";
import {singleResultRepoQuerier} from "../../../../database/SingleResultRepoQuerier";

interface CsvRow {
  cardId:string,
  includes:string,
  excludes:string,
  openListingUrl:string,
}
const retrieveCsv = async ():Promise<string> => {
  const rows:Array<CsvRow> = [];
  await tempKeywordUrlRepository.iterator()
    .sort([])
    .iterate(async (tempUrl) => {
      rows.push({
        cardId: tempUrl.cardId,
        includes: tempUrl.searchParams.includeKeywords.join('|'),
        excludes: tempUrl.searchParams.excludeKeywords.join('|'),
        openListingUrl: tempUrl.openListingUrl,
      })
      return false;
    })
  return jsonToCsv.parse(rows);
}

const retrieveByCardId = (cardId:string):Promise<TempKeywordUrlEntity|null> => {
  return singleResultRepoQuerier.query(
    tempKeywordUrlRepository,
    [ { name: "cardId", value: cardId } ],
    tempKeywordUrlRepository.collectionName
  );
}

export const tempKeywordUrlRetriever = {
  retrieveCsv,
  retrieveByCardId,
}