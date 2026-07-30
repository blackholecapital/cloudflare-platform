import "dotenv/config";

export function getCloudflareConfig() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!token) {
    throw new Error("CLOUDFLARE_API_TOKEN is not set");
  }

  if (!accountId) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID is not set");
  }

  return {
    token,
    accountId,
  };
}
