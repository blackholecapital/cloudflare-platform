#!/usr/bin/env tsx

import { Command } from "commander";
import { loadManifest } from "../utils/loadManifest";
import {
  listWorkers,
  listD1Databases,
  listKVNamespaces,
  listQueues,
  listPagesProjects
} from "../cloudflare/resources";

const program = new Command();

program
  .name("cloudflare-platform")
  .version("0.2.0");

program
  .command("inventory")
  .argument(
    "[manifest]",
    "Customer manifest",
    "customer-manifests/examples/blackhole.yaml"
  )
  .action(async (manifestPath) => {
    const manifest = loadManifest(manifestPath);

    console.log("");
    console.log("Cloudflare Inventory");
    console.log("====================");
    console.log("");

    console.log("Customer :", manifest.customer.name);
    console.log("Zone     :", manifest.cloudflare.zone);
    console.log("");

    const [
      workers,
      d1,
      kv,
      queues,
      pages
    ] = await Promise.all([
      listWorkers(),
      listD1Databases(),
      listKVNamespaces(),
      listQueues(),
      listPagesProjects()
    ]);

    console.log(`Workers : ${workers.result.length}`);
    console.log(`D1      : ${d1.result.length}`);
    console.log(`KV      : ${kv.result.length}`);
    console.log(`Queues  : ${queues.result.length}`);
    console.log(`Pages   : ${pages.result.length}`);
  });

program.parse();
