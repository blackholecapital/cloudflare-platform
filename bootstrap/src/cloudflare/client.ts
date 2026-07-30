import { getCloudflareConfig } from "./auth";

export async function cloudflareRequest(path: string) {
  const { token } = getCloudflareConfig();

  const response = await fetch(
    `https://api.cloudflare.com/client/v4${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Cloudflare API returned ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
