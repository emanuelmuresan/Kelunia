declare module "resend" {
  type ResendEmailOptions = {
    from: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string | string[];
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
