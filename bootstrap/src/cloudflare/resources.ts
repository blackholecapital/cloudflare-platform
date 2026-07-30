import { cloudflareRequest } from "./client";
import { getCloudflareConfig } from "./auth";

export async function listWorkers() {
  const { accountId } = getCloudflareConfig();
  return cloudflareRequest(`/accounts/${accountId}/workers/scripts`);
}

export async function listD1Databases() {
  const { accountId } = getCloudflareConfig();
  return cloudflareRequest(`/accounts/${accountId}/d1/database`);
}

export async function listKVNamespaces() {
  const { accountId } = getCloudflareConfig();
  return cloudflareRequest(`/accounts/${accountId}/storage/kv/namespaces`);
}

export async function listQueues() {
  const { accountId } = getCloudflareConfig();
  return cloudflareRequest(`/accounts/${accountId}/queues`);
}

export async function listPagesProjects() {
  const { accountId } = getCloudflareConfig();
  return cloudflareRequest(`/accounts/${accountId}/pages/projects`);
}
