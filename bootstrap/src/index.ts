import { loadManifest } from "./utils/loadManifest";

try {
  const manifest = loadManifest(
    "customer-manifests/examples/blackhole.yaml"
  );

  console.log("✓ Manifest validated");
  console.log(JSON.stringify(manifest, null, 2));
} catch (err) {
  console.error("✗ Manifest validation failed");
  console.error(err);
  process.exit(1);
}
