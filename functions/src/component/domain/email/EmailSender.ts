// import {mailchimpTransactional} from "../../external-lib/Mailchimp";

export interface Variable {
  name:string,
  content:string
}

export interface EmailRecipient {
  name?:string,
  email:string,
  userId:string,
  type?:'to'|'cc'|'bcc',
  variables?:Array<Variable>
}

export interface EmailDetails {
  subject:string,
  fromEmail:string,
  fromName?:string,
  to:Array<EmailRecipient>,
  headers?:{[key:string]:string},
  globalVariables?:Array<Variable>
}

export interface SendTemplateEmailRequest {
  templateName:string,
  message:EmailDetails
  metadata:any
}

export interface SendTemplateResponse {
  email:string,
  status:'sent'|'queued'|'rejected'|'invalid',
  reject_reason:string,
  _id:string
}

const sendTemplateEmail = async (request:SendTemplateEmailRequest):Promise<Array<SendTemplateResponse>> => {
  // const response = await mailchimpTransactional.messages.sendTemplate({
  //   template_name: request.templateName,
  //   template_content: [],
  //   message: {
  //     subject: request.message.subject,
  //     from_email: request.message.fromEmail,
  //     from_name: request.message.fromName,
  //     headers: request.message.headers,
  //     to: request.message.to.map(user => ({
  //       name: user.name,
  //       email: user.email,
  //       type: user.type,
  //     })),
  //     recipient_metadata: request.message.to.map(user => ({
  //       rcpt: user.email,
  //       values: {
  //         userId: user.userId,
  //       },
  //     })),
  //     global_merge_vars: request.message.globalVariables,
  //     merge_vars: request.message.to.filter(user => !!user.variables).map(user => ({
  //       rcpt: user.email,
  //       vars: user.variables,
  //     })),
  //   },
  // });
  // return response;
  return []
}

export const emailSender = {
  sendTemplateEmail,
}