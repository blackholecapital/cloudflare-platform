import type { Inventory } from "../types/inventory";
import type { Plan } from "../types/plan";
import { diffResources } from "./diff";

export function buildPlan(
  manifest: any,
  inventory: Inventory
): Plan {

  const desiredWorkers =
    manifest.cloudflare?.workers?.map((w: any) => w.name) ?? [];

  const desiredD1 =
    manifest.cloudflare?.d1?.map((d: any) => d.name) ?? [];

  const desiredKV =
    manifest.cloudflare?.kv?.map((k: any) => k.name) ?? [];

  const desiredQueues =
    manifest.cloudflare?.queues?.map((q: any) => q.name) ?? [];

  const desiredPages =
    manifest.cloudflare?.pages?.map((p: any) => p.name) ?? [];

  return {
    operations: [
      ...diffResources("worker", desiredWorkers, inventory.workers),
      ...diffResources("d1", desiredD1, inventory.d1),
      ...diffResources("kv", desiredKV, inventory.kv),
      ...diffResources("queue", desiredQueues, inventory.queues),
      ...diffResources("page", desiredPages, inventory.pages)
    ]
  };
}
