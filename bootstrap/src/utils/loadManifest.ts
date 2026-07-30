import fs from "node:fs";
import YAML from "yaml";
import { CustomerManifest } from "../types/customer";

export function loadManifest(path: string): CustomerManifest {
  const file = fs.readFileSync(path, "utf8");
  return YAML.parse(file) as CustomerManifest;
}
