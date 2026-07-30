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

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      [
        `Cloudflare API Error`,
        `Status : ${response.status}`,
        `Path   : ${path}`,
        `Body   : ${body}`,
      ].join("\n")
    );
  }

  return JSON.parse(body);
}
