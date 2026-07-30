import { loadManifest } from "./utils/loadManifest";
import { getCloudflareConfig } from "./cloudflare/auth";

try {
  const manifest = loadManifest(
    "customer-manifests/examples/blackhole.yaml"
  );

  const cloudflare = getCloudflareConfig();

  console.log("✓ Manifest validated");
  console.log("✓ Cloudflare configuration loaded");

  console.log({
    accountId: cloudflare.accountId,
    customer: manifest.customer.id,
    zone: manifest.cloudflare.zone,
  });
} catch (err) {
  console.error(err);
  process.exit(1);
}
