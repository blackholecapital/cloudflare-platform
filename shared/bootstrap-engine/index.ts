import { loadManifest } from "./utils/loadManifest";
import { listWorkers } from "./cloudflare/resources";

async function main() {
  const manifest = loadManifest(
    "customer-manifests/examples/blackhole.yaml"
  );

  console.log("✓ Manifest validated");

  const workers = await listWorkers();

  console.log("Customer:", manifest.customer.name);
  console.log("Zone:", manifest.cloudflare.zone);

  console.log("\nWorkers:\n");
  console.log(JSON.stringify(workers.result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
