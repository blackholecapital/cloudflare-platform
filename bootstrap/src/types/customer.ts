export interface CustomerManifest {
  customer: {
    id: string;
    name: string;
  };

  cloudflare: {
    accountId: string;
    zone: string;
  };

  gpu: {
    endpoint: string;
  };

  providers: {
    google: boolean;
    slack: boolean;
    twilio: boolean;
    docusign: boolean;
    stripe: boolean;
  };
}
