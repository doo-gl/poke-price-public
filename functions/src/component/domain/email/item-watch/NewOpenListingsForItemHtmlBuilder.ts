import {Content} from "../../card/PublicCardDto";
import {emailContentParser} from "../EmailContentParser";
import {queryString} from "../../../external-lib/QueryString";


const logo = (logoUrl:string|null):string => {
  if (!logoUrl) {
    return ''
  }
  return `<table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnTextBlock" style="min-width:100%;">
    <tbody class="mcnTextBlockOuter">
        <tr>
            <td valign="top" class="mcnTextBlockInner" style="padding-top:9px;">
              \t<!--[if mso]>
\t\t\t\t<table align="left" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
\t\t\t\t<tr>
\t\t\t\t<![endif]-->
\t\t\t    
\t\t\t\t<!--[if mso]>
\t\t\t\t<td valign="top" width="600" style="width:600px;">
\t\t\t\t<![endif]-->
                <table align="left" border="0" cellpadding="0" cellspacing="0" style="max-width:100%; min-width:100%;" width="100%" class="mcnTextContentContainer">
                    <tbody><tr>
                        
                        <td valign="top" class="mcnTextContent" style="padding-top:0; padding-right:18px; padding-bottom:9px; padding-left:18px;">
                        
                            <div style="text-align: center;"><img height="100" src="${logoUrl}" style="border: 0px  ; width: 252px; height: 100px; margin: 0px;" width="252"></div>

                        </td>
                    </tr>
                </tbody></table>
\t\t\t\t<!--[if mso]>
\t\t\t\t</td>
\t\t\t\t<![endif]-->
                
\t\t\t\t<!--[if mso]>
\t\t\t\t</tr>
\t\t\t\t</table>
\t\t\t\t<![endif]-->
            </td>
        </tr>
    </tbody>
</table>`
}

const title = (numberOfNewListings:number, itemName:string) => {
  return `<table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnTextBlock" style="min-width:100%;">
    <tbody class="mcnTextBlockOuter">
        <tr>
            <td valign="top" class="mcnTextBlockInner" style="padding-top:9px;">
              \t<!--[if mso]>
\t\t\t\t<table align="left" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
\t\t\t\t<tr>
\t\t\t\t<![endif]-->
\t\t\t    
\t\t\t\t<!--[if mso]>
\t\t\t\t<td valign="top" width="600" style="width:600px;">
\t\t\t\t<![endif]-->
                <table align="left" border="0" cellpadding="0" cellspacing="0" style="max-width:100%; min-width:100%;" width="100%" class="mcnTextContentContainer">
                    <tbody><tr>
                        
                        <td valign="top" class="mcnTextContent" style="padding-top:0; padding-right:18px; padding-bottom:9px; padding-left:18px;">
                        
                            <h1 style="text-align: center;"><strong>${numberOfNewListings}</strong> new ${numberOfNewListings === 1 ? 'listing' : 'listings'} for ${itemName}.</h1>

                        </td>
                    </tr>
                </tbody></table>
\t\t\t\t<!--[if mso]>
\t\t\t\t</td>
\t\t\t\t<![endif]-->
                
\t\t\t\t<!--[if mso]>
\t\t\t\t</tr>
\t\t\t\t</table>
\t\t\t\t<![endif]-->
            </td>
        </tr>
    </tbody>
</table>`
}

export interface NewListingDetails {
  listingName:string,
  listingPrice:string,
  priceDiff:string|null,
  priceDiffColour:string,
  listingDetails:Content,
  listingUrl:string,
}

const listing = (details:NewListingDetails):string => {
  return `<table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnTextBlock" style="min-width:100%;">
    <tbody class="mcnTextBlockOuter">
        <tr>
            <td valign="top" class="mcnTextBlockInner" style="padding-top:9px;">
              \t<!--[if mso]>
\t\t\t\t<table align="left" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
\t\t\t\t<tr>
\t\t\t\t<![endif]-->
\t\t\t    
\t\t\t\t<!--[if mso]>
\t\t\t\t<td valign="top" width="600" style="width:600px;">
\t\t\t\t<![endif]-->
                <table align="left" border="0" cellpadding="0" cellspacing="0" style="max-width:100%; min-width:100%;" width="100%" class="mcnTextContentContainer">
                    <tbody><tr>
                        
                        <td valign="top" class="mcnTextContent" style="padding-top:0; padding-right:18px; padding-bottom:9px; padding-left:18px;">
                        
                            <div style="text-align: center;">
                              <strong>${details.listingName}</strong>
                            </div>

                        </td>
                    </tr>
                </tbody></table>
\t\t\t\t<!--[if mso]>
\t\t\t\t</td>
\t\t\t\t<![endif]-->
                
\t\t\t\t<!--[if mso]>
\t\t\t\t</tr>
\t\t\t\t</table>
\t\t\t\t<![endif]-->
            </td>
        </tr>
    </tbody>
</table><table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnTextBlock" style="min-width:100%;">
    <tbody class="mcnTextBlockOuter">
        <tr>
            <td valign="top" class="mcnTextBlockInner" style="padding-top:9px;">
              \t<!--[if mso]>
\t\t\t\t<table align="left" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
\t\t\t\t<tr>
\t\t\t\t<![endif]-->
\t\t\t    
\t\t\t\t<!--[if mso]>
\t\t\t\t<td valign="top" width="300" style="width:300px;">
\t\t\t\t<![endif]-->
                <table align="left" border="0" cellpadding="0" cellspacing="0" style="max-width:300px;" width="100%" class="mcnTextContentContainer">
                    <tbody><tr>
                        
                        <td valign="top" class="mcnTextContent" style="padding-top:0; padding-left:18px; padding-bottom:9px; padding-right:18px;">
                        
                            <div style="text-align: left;">
                              ${emailContentParser.parse([details.listingDetails])}
                            </div>

                        </td>
                    </tr>
                </tbody></table>
\t\t\t\t<!--[if mso]>
\t\t\t\t</td>
\t\t\t\t<![endif]-->
                
\t\t\t\t<!--[if mso]>
\t\t\t\t<td valign="top" width="300" style="width:300px;">
\t\t\t\t<![endif]-->
                <table align="left" border="0" cellpadding="0" cellspacing="0" style="max-width:300px;" width="100%" class="mcnTextContentContainer">
                    <tbody><tr>
                        
                        <td valign="top" class="mcnTextContent" style="padding-top:0; padding-left:18px; padding-bottom:9px; padding-right:18px;">
                        
                            <div style="text-align: right;">
                              Current Price: <strong>${details.listingPrice}</strong>
                              <br>
                              ${details.priceDiff ? 'Profit: <strong><span style="color:' + details.priceDiffColour + '">' + details.priceDiff + '</span></strong>' : ''}
                            </div>


                        </td>
                    </tr>
                </tbody></table>
\t\t\t\t<!--[if mso]>
\t\t\t\t</td>
\t\t\t\t<![endif]-->
                
\t\t\t\t<!--[if mso]>
\t\t\t\t</tr>
\t\t\t\t</table>
\t\t\t\t<![endif]-->
            </td>
        </tr>
    </tbody>
</table><table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnButtonBlock" style="min-width:100%;">
    <tbody class="mcnButtonBlockOuter">
        <tr>
            <td style="padding-top:0; padding-right:18px; padding-bottom:18px; padding-left:18px;" valign="top" align="center" class="mcnButtonBlockInner">
                <table border="0" cellpadding="0" cellspacing="0" class="mcnButtonContentContainer" style="border-collapse: separate !important;border-radius: 4px;background-color: #F23B2F;">
                    <tbody>
                        <tr>
                            <td align="center" valign="middle" class="mcnButtonContent" style="font-family: Arial; font-size: 16px; padding: 18px;">
                                <a class="mcnButton" title="View Listing" href="https://pokeprice.io/redirect/ebay?${queryString.stringify({redirectUrl: details.listingUrl})}" target="_blank" style="font-weight: bold;letter-spacing: normal;line-height: 100%;text-align: center;text-decoration: none;color: #FFFFFF;">View Listing</a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
    </tbody>
</table>`
}

const viewAllListings = (itemId:string) => {
  return `<table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnButtonBlock" style="min-width:100%;">
    <tbody class="mcnButtonBlockOuter">
        <tr>
            <td style="padding-top:0; padding-right:18px; padding-bottom:18px; padding-left:18px;" valign="top" align="left" class="mcnButtonBlockInner">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnButtonContentContainer" style="border-collapse: separate !important;border-radius: 4px;background-color: #F23B2F;">
                    <tbody>
                        <tr>
                            <td align="center" valign="middle" class="mcnButtonContent" style="font-family: Lato, 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; padding: 16px;">
                                <a class="mcnButton " title="View all listings" href="https://pokeprice.io/card/${itemId}?tab=LISTINGS" target="_blank" style="font-weight: bold;letter-spacing: 1px;line-height: 100%;text-align: center;text-decoration: none;color: #FFFFFF;">View all listings</a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
    </tbody>
</table>`
}

const divider = () => {
  return `<table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnDividerBlock" style="min-width:100%;">
    <tbody class="mcnDividerBlockOuter">
        <tr>
            <td class="mcnDividerBlockInner" style="min-width:100%; padding:18px;">
                <table class="mcnDividerContent" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%;border-top: 2px solid #EAEAEA;">
                    <tbody><tr>
                        <td>
                            <span></span>
                        </td>
                    </tr>
                </tbody></table>
<!--            
                <td class="mcnDividerBlockInner" style="padding: 18px;">
                <hr class="mcnDividerContent" style="border-bottom-color:none; border-left-color:none; border-right-color:none; border-bottom-width:0; border-left-width:0; border-right-width:0; margin-top:0; margin-right:0; margin-bottom:0; margin-left:0;" />
-->
            </td>
        </tr>
    </tbody>
</table>`
}

export const newOpenListingForItemHtmlBuilder = {
  logo,
  title,
  listing,
  divider,
  viewAllListings,
}