import {Filter as RaFilter, FilterProps, TextInput, useListContext} from "react-admin";
import {CompoundField, QueryField, useDomainDescription} from "../infrastructure/useDomainDescription";
import {convertCase} from "../external-lib/ConvertCase";
import React, {useEffect} from "react";
import {dotObject} from "../external-lib/DotObject";

interface Props extends Omit<FilterProps, 'children'> {
  domain:string,
}

export const Filter = (props:Props) => {
  const domainDescription = useDomainDescription(props.domain).data;
  const context  = useListContext();
  const currentSort = context.currentSort
  useEffect(() => {
    const allowedSortFields = domainDescription?.getMany.sortFields ?? []
    const isAllowedSort = allowedSortFields.some(fieldName => fieldName === currentSort?.field)
    if (!isAllowedSort) {
      return
    }

    context.setFilters(
      {
        ...(context.filter ?? {}),
        ...(context.filterValues ?? {}),
        // sortField: currentSort.field,
        // sortDirection: currentSort.order
      },
      {}
    )
  }, [currentSort?.field, currentSort?.order, domainDescription])

  if (!domainDescription) {
    return null;
  }
  const metadata = domainDescription.getMany;
  const queryFieldsToShow = calculateFiltersToShow(context.filterValues, metadata.queryFields, metadata.allowedCompoundFields);

  return (
    <RaFilter {...props}>
      {queryFieldsToShow.map(queryField => {
        if (!queryField) {
          return null;
        }
        const label = convertCase.toTextCase(queryField.name)
        return (
          <TextInput key={queryField.name} label={label} source={queryField.name}  />
        )
      })}
    </RaFilter>
  )
}

const calculateFiltersToShow = (displayedFilters:{[key:string]:any}, queryFields:Array<QueryField>, allowedCompoundFields:Array<CompoundField>):Array<QueryField> => {

  const transformedFilters = dotObject.dot(displayedFilters)
  const queryFieldsBeingDisplayed:{[key:string]: QueryField} = {}
  queryFields.filter(field => !!transformedFilters[field.name]).forEach(queryField => {
    queryFieldsBeingDisplayed[queryField.name] = queryField;
  })
  const numberOfDisplayedFields = Object.keys(queryFieldsBeingDisplayed).length
  if (numberOfDisplayedFields === 0) {
    return queryFields
  }

  const remainingPossibleFieldNames:Array<string[]|null> = allowedCompoundFields.map(compoundField => {
    if (compoundField.fieldNames.length < numberOfDisplayedFields) {
      return null; // there are more filters currently on than this compound field has, therefore it cannot provide more fields
    }
    const matchedFieldNames:Array<string> = []
    const unmatchedFieldNames:Array<string> = []
    compoundField.fieldNames.forEach(fieldName => {
      if (queryFieldsBeingDisplayed[fieldName]) {
        matchedFieldNames.push(fieldName)
      } else {
        unmatchedFieldNames.push(fieldName);
      }
    })
    if (matchedFieldNames.length !== numberOfDisplayedFields) {
      return null; // not all of the displayed fields matched, therefore this compound field does not apply
    }
    return unmatchedFieldNames; // all query fields exist in the compound field, any remaining fields can be queried
  })

  const allowedFieldNames:{[key:string]:string} = {};
  remainingPossibleFieldNames.forEach(fieldNames => {
    if (!fieldNames) {
      return;
    }
    fieldNames.forEach(fieldName => {
      allowedFieldNames[fieldName] = fieldName;
    })
  });
  const fieldNameToQueryField:{[key:string]:QueryField} = {};
  queryFields.forEach(queryField => {
    fieldNameToQueryField[queryField.name] = queryField
  })
  const currentQueryFields = Object.values(queryFieldsBeingDisplayed);
  const allowedRemainingQueryFields = Object.keys(allowedFieldNames)
    .map(fieldName => fieldNameToQueryField[fieldName])
  return currentQueryFields.concat(allowedRemainingQueryFields);
}