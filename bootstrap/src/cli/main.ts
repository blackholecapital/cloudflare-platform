#!/usr/bin/env tsx

import { Command } from "commander";
import { loadManifest } from "../utils/loadManifest";
import { collectInventory } from "../engine/inventory";

const program = new Command();

program
  .name("cloudflare-platform")
  .version("0.3.0");

program
  .command("inventory")
  .argument(
    "[manifest]",
    "Customer manifest",
    "customer-manifests/examples/blackhole.yaml"
  )
  .action(async (manifestPath) => {

    const manifest = loadManifest(manifestPath);

    const inventory = await collectInventory();

    console.log("");
    console.log("Cloudflare Inventory");
    console.log("====================");
    console.log("");

    console.log("Customer :", manifest.customer.name);
    console.log("");

    console.log(JSON.stringify(inventory,null,2));

  });

program.parse();
