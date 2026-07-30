import { loadManifest } from "./utils/loadManifest";

const manifest = loadManifest(
  "customer-manifests/examples/blackhole.yaml"
);

console.log("Cloudflare Platform Bootstrap");
console.log(JSON.stringify(manifest, null, 2));
