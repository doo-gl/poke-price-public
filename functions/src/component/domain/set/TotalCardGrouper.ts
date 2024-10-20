import {setRetriever} from "./SetRetriever";
import {toMultiMap} from "../../tools/MapBuilder";
import {SetEntity} from "./SetEntity";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";

/*
 * Returns a list of sets grouped by their total card count, in descending order of number of sets in the group.
 * This is to see which sets have the same number of cards in them, this is useful because it allows us to see which sets need to
 * include set name when searching for the card like 14/109 if 2sets have 109 cards, they will overlap.
 */
const group = async () => {
  const sets = await setRetriever.retrieveAll();
  const countToSets = toMultiMap<SetEntity, number, string>(
    sets,
    set => set.totalCards,
    set => set.name
  );
  const counts:Array<any> = []
  countToSets.forEach((value, key) => {
    counts.push({
      count: key,
      sets: value,
    })
  })
  counts.sort(comparatorBuilder.objectAttributeDESC(value => value.sets.length));
  return counts;
}

export const totalCardGrouper = {
  group,
}