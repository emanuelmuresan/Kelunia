declare module "resend" {
  export class Resend {
    constructor(apiKey?: string);
    emails: {
      send(options: any): Promise<any>;
    };
  }
  export default Resend;
}
