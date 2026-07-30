#!/usr/bin/env tsx

import { Command } from "commander";
import { loadManifest } from "../utils/loadManifest";
import { listWorkers } from "../cloudflare/resources";

const program = new Command();

program
  .name("cloudflare-platform")
  .description("Cloudflare Platform Bootstrap")
  .version("0.1.0");

program
  .command("inventory")
  .argument(
    "[manifest]",
    "Customer manifest",
    "customer-manifests/examples/blackhole.yaml"
  )
  .action(async (manifestPath) => {
    const manifest = loadManifest(manifestPath);

    console.log(`Customer : ${manifest.customer.name}`);
    console.log(`Zone     : ${manifest.cloudflare.zone}`);
    console.log("");

    const workers = await listWorkers();

    console.log("Workers");
    console.log("-------");

    for (const worker of workers.result) {
      console.log(worker.id);
    }

    console.log("");
    console.log(`Total Workers: ${workers.result.length}`);
  });

program.parse();
