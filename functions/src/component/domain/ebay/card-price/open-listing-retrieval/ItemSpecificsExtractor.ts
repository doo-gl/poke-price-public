import Root = cheerio.Root;
import {ParsingError} from "../../../../error/ParsingError";
import {textExtractor} from "../ended-listing-retrieval/TextExtractor";

const extract1 = (url:string, $:Root):{[key:string]:string} => {
  const table = $('#viTabs_0_is.itemAttr').find('table').not('#itmSellerDesc');
  if (table.length === 0) {
    return {};
  }
  if (table.length > 1) {
    throw new ParsingError(`${table.length} tags matching "$('#viTabs_0_is.itemAttr').find('table').not('#itmSellerDesc')" in listing on url: ${url}`);
  }
  const labels:Array<string> = [];
  table.find('td.attrLabels').each((index, element) => {
    const text = textExtractor.extractFromElement(element);
    if (!text) {
      throw new ParsingError(`Empty attribute label at url ${url}`);
    }
    labels.push(text.trim().replace(':', ''));
  })

  const values:Array<string> = [];
  table.find('td').not('.attrLabels').each((index, element) => {
    const text = textExtractor.extractFromElement(element);
    if (!text) {
      throw new ParsingError(`Empty attribute value at url ${url}`);
    }
    values.push(text.trim());
  })

  if (labels.length === 0) {
    return {}
  }

  if (labels.length === 1 && (labels[0] === 'Condition' || labels[0] === 'EAN')) {
    return {}
  }

  if (labels.length !== values.length) {
    return {}
  }
  const specifics:{[key:string]:string} = {}
  for (let labelIndex = 0; labelIndex < labels.length; labelIndex++) {
    specifics[labels[labelIndex]] = values[labelIndex]
  }
  if (specifics['Condition']) {
    delete specifics['Condition']
  }
  return specifics;
}

const extract2 = (url:string, $:Root):{[key:string]:string} => {
  const table = $('.ux-layout-section__item--table-view')
  if (!table || table.length === 0) {
    return {}
  }
  const rows = table.find('.ux-layout-section__row')
  const labels = rows.find('.ux-labels-values__labels')
  const values = rows.find('.ux-labels-values__values')
  if (labels.length !== values.length) {
    return {}
  }
  const result:{[key:string]:string} = {}
  for (let i = 0; i < labels.length; i++) {
    const label = labels.eq(i);
    const value = values.eq(i);
    const labelText = textExtractor.extractFromCheerio(label.find('.ux-textspans'))
    const isValueExpandable = value.find('.ux-expandable-textual-display-block-inline').length > 0;
    let valueText;
    if (!isValueExpandable) {
      valueText = textExtractor.extractFromCheerio(value.find('.ux-textspans'))
    } else {
      const expandableValue = value
        .find('.ux-expandable-textual-display-block-inline')
        .not('.hide')
      valueText = textExtractor.extractFromCheerio(expandableValue.children('span > span').find('.ux-textspans'))
    }
    const key = labelText.trim().replace(/:/gim, '')
    const resultValue = valueText.trim()
    if (key && key.length > 0 && resultValue && resultValue.length > 0) {
      result[key] = resultValue
    }
  }
  return result;
}

const extract3 = (url:string, $:Root):{[key:string]:string} => {
  const table = $('.ux-layout-section-evo__item')
  if (!table || table.length === 0) {
    return {}
  }
  const rows = table.find('.ux-layout-section-evo__col')
  const result:{[key:string]:string} = {}
  for (let i = 0; i < rows.length; i++) {
    const row = rows.eq(i)
    const labelText = textExtractor.extractFromCheerio(row.find('.ux-labels-values__labels-content'))
    const valueText = textExtractor.extractFromCheerio(row.find('.ux-labels-values__values-content'))
    const key = labelText.trim().replace(/:/gim, '')
    const resultValue = valueText.trim()
    if (key && key.length > 0 && resultValue && resultValue.length > 0) {
      result[key] = resultValue
    }

  }

  return result;
}

const extract = (url:string, $:Root):{[key:string]:string} => {
  const res3 = extract3(url, $)
  if (Object.values(res3).length > 0) {
    return res3
  }
  const res2 = extract2(url, $)
  if (Object.values(res2).length > 0) {
    return res2
  }
  return extract1(url, $)
}

export const itemSpecificsExtractor = {
  extract,
}