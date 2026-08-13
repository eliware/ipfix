import os from "node:os";
import path from "node:path";
import fs from "node:fs";

export const CONFIG_DIR = ".ipfix";
export const CONFIG_FILE = "config.json";

export function configPath(homeDir = os.homedir()) {
  return path.join(homeDir, CONFIG_DIR, CONFIG_FILE);
}

export function readConfig({ homeDir = os.homedir(), fsImpl = fs } = {}) {
  const file = configPath(homeDir);
  try { return JSON.parse(fsImpl.readFileSync(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return {}; throw error; }
}

export function activeUrl({ env = process.env, homeDir = os.homedir(), fsImpl = fs } = {}) {
  return { url: env.IPFIX_URL || readConfig({ homeDir, fsImpl }).url || null, source: env.IPFIX_URL ? "environment" : "config" };
}

export function normalizeUrl(value) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error("URL must be an absolute http:// or https:// URL"); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("URL must use http:// or https://");
  return parsed.toString().replace(/\/$/, "");
}

export function writeConfig(url, { homeDir = os.homedir(), fsImpl = fs } = {}) {
  const file = configPath(homeDir);
  fsImpl.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fsImpl.writeFileSync(file, `${JSON.stringify({ url }, null, 2)}\n`, { mode: 0o600 });
  return file;
}

export function unsetConfig({ homeDir = os.homedir(), fsImpl = fs } = {}) {
  try { fsImpl.unlinkSync(configPath(homeDir)); } catch (error) { if (error.code !== "ENOENT") throw error; }
}
