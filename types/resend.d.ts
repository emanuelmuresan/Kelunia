// Declarații de tipuri minimale pentru pachetul „resend” (doar ce folosesc funcțiile cloud: trimiterea unui email și răspunsul ei).
declare module "resend" {
  type ResendEmailOptions = {
    from: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string | string[];
    headers?: Record<string, string>;
  };

  type ResendEmailResponse = {
    data?: {
      id?: string;
    } | null;
    error?: {
      message: string;
    } | null;
  };

  export class Resend {
    constructor(apiKey?: string);
    emails: {
      send(options: ResendEmailOptions): Promise<ResendEmailResponse>;
    };
  }
  export default Resend;
}
