export type ResourceType =
  | "worker"
  | "d1"
  | "kv"
  | "queue"
  | "page";

export type Action =
  | "create"
  | "delete"
  | "noop";

export interface PlanOperation {
  type: ResourceType;
  resource: string;
  action: Action;
}

export interface Plan {
  operations: PlanOperation[];
}
