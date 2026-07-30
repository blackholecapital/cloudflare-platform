import { cloudflareRequest } from "./client";
import { getCloudflareConfig } from "./auth";

export async function listWorkers() {
  const { accountId } = getCloudflareConfig();

  return cloudflareRequest(
    `/accounts/${accountId}/workers/scripts`
  );
}
