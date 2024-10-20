import {ItemModification, toGradingDetails} from "../modification/ItemModification";
import {SearchTag} from "../search-tag/SearchTagEntity";
import {GRADER_SEARCH_TAG_KEY, GRADE_SEARCH_TAG_KEY, GRADED_SEARCH_TAG_KEY} from "./EbayListingTagExtractor";


const generate = (itemModification:ItemModification):Array<SearchTag> => {
  const gradingDetails = toGradingDetails(itemModification.details)
  if (!gradingDetails) {
    return []
  }
  const graderKey = gradingDetails.graderKey
  const graderName = gradingDetails.graderName
  const grade = gradingDetails.grade

  return [
    {key: GRADER_SEARCH_TAG_KEY, keyLabel: "Grading Company", value: graderKey, valueLabel: graderName, public: true},
    {key: GRADE_SEARCH_TAG_KEY, keyLabel: "Grade", value: grade.toLowerCase(), valueLabel: grade, public: true},
    {key: GRADED_SEARCH_TAG_KEY, keyLabel: "Graded", value: 'graded', valueLabel: 'Graded', public: true},
  ]
}

export const itemModificationTagGenerator = {
  generate,
}