#!/usr/bin/env tsx

import { Command } from "commander";
import { loadManifest } from "../utils/loadManifest";
import { collectInventory } from "../engine/inventory";
import { buildPlan } from "../engine/planner";

const program = new Command();

program
  .name("cloudflare-platform")
  .version("0.4.0");

program
  .command("plan")
  .argument(
    "[manifest]",
    "Customer manifest",
    "customer-manifests/examples/blackhole.yaml"
  )
  .action(async (manifestPath) => {

    const manifest = loadManifest(manifestPath);

    const inventory = await collectInventory();

    const plan = buildPlan(manifest, inventory);

    console.log("");
    console.log("Execution Plan");
    console.log("==============");
    console.log("");

    for (const op of plan.operations) {
      console.log(
        `${op.action.padEnd(8)} ${op.type.padEnd(8)} ${op.resource}`
      );
    }

    console.log("");

    const summary = {
      create: plan.operations.filter(o => o.action === "create").length,
      delete: plan.operations.filter(o => o.action === "delete").length,
      noop: plan.operations.filter(o => o.action === "noop").length
    };

    console.table(summary);

  });

program.parse();
