import type { Action, PlanOperation, ResourceType } from "../types/plan";

export function diffResources(
  type: ResourceType,
  desired: string[],
  actual: string[]
): PlanOperation[] {

  const desiredSet = new Set(desired);
  const actualSet = new Set(actual);

  const operations: PlanOperation[] = [];

  for (const name of desiredSet) {
    operations.push({
      type,
      resource: name,
      action: actualSet.has(name) ? "noop" : "create"
    });
  }

  for (const name of actualSet) {
    if (!desiredSet.has(name)) {
      operations.push({
        type,
        resource: name,
        action: "delete"
      });
    }
  }

  return operations.sort((a, b) =>
    a.resource.localeCompare(b.resource)
  );
}
