import fs from "node:fs";
import YAML from "yaml";
import { CustomerManifestSchema } from "../schema/customer";

export function loadManifest(path: string) {
  const file = fs.readFileSync(path, "utf8");
  const parsed = YAML.parse(file);
  return CustomerManifestSchema.parse(parsed);
}
