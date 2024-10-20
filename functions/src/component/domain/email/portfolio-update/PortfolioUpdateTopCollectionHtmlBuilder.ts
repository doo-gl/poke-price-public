
export interface CollectionHtmlVariables {
  logoUrl:string|null,
  itemsOwned:string,
  itemsInCollection:string,
  itemsPercentage:string,
  itemsChange:string,
  itemsValue:string,
  itemsValueChange:string,
}

const buildLogo = (logoUrl:string|null) => {
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

const build = (vars:CollectionHtmlVariables) => {
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
</table>${buildLogo(vars.logoUrl)}<table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnTextBlock" style="min-width:100%;">
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
                        
                            <div style="text-align: center;"><span style="font-size:18px">You own:<br>
<strong>${vars.itemsOwned} </strong>of <strong>${vars.itemsInCollection} </strong>(${vars.itemsPercentage}) cards<br>
${vars.itemsChange}</span></div>

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
                        
                            <div style="text-align: center;"><span style="font-size:18px">Value:<br>
<strong>${vars.itemsValue}</strong><br>
${vars.itemsValueChange}</span></div>

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

export const portfolioUpdateTopCollectionHtmlBuilder = {
  build,
}