export type WhatsAppProviderId = "dialog" | "bizuply";

export type WhatsAppHeaderMime = "image/jpeg" | "image/png";

export type WhatsAppTemplateComponent = {
  type: string;
  sub_type?: string;
  index?: string;
  parameters?: Array<Record<string, unknown>>;
};

export type WhatsAppTemplateSendInput = {
  to: string;
  templateName: string;
  languageCode: string;
  components: WhatsAppTemplateComponent[];
};

export type WhatsAppTemplateSendResult = {
  provider: WhatsAppProviderId;
  messageId: string;
  providerResponse: Record<string, unknown>;
};

export type WhatsAppHeaderUploadInput = {
  bytes: Buffer;
  mime: WhatsAppHeaderMime;
  filename: string;
};

export type WhatsAppTextSendInput = {
  to: string;
  body: string;
};

export type WhatsAppProvider = {
  id: WhatsAppProviderId;
  /** Stable secret-free fingerprint of the channel that owns uploaded media ids. */
  accountKey: string;
  uploadHeaderMedia(input: WhatsAppHeaderUploadInput): Promise<string>;
  sendTemplate(input: WhatsAppTemplateSendInput): Promise<WhatsAppTemplateSendResult>;
  sendText(input: WhatsAppTextSendInput): Promise<WhatsAppTemplateSendResult>;
};
