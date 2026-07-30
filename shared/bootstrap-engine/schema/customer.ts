import { z } from "zod";

export const CustomerManifestSchema = z.object({
  customer: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }),

  cloudflare: z.object({
    accountId: z.string().min(1),
    zone: z.string().min(1),
  }),

  gpu: z.object({
    endpoint: z.string().url(),
  }),

  providers: z.object({
    google: z.boolean(),
    slack: z.boolean(),
    twilio: z.boolean(),
    docusign: z.boolean(),
    stripe: z.boolean(),
  }),
});

export type CustomerManifest = z.infer<typeof CustomerManifestSchema>;
