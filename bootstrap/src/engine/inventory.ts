import {
  listWorkers,
  listD1Databases,
  listKVNamespaces,
  listQueues,
  listPagesProjects
} from "../cloudflare/resources";

import type { Inventory } from "../types/inventory";

export async function collectInventory(): Promise<Inventory> {
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

  return {
    workers: workers.result.map((x: any) => x.id).sort(),
    d1: d1.result.map((x: any) => x.name).sort(),
    kv: kv.result.map((x: any) => x.title).sort(),
    queues: queues.result.map((x: any) => x.queue_name).sort(),
    pages: pages.result.map((x: any) => x.name).sort()
  };
}
