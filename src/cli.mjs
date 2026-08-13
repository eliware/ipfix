import os from "node:os";
import { VERSION } from "./version.mjs";
import { printHelp } from "./help.mjs";
import { parseArgs } from "./args.mjs";
import { activeUrl, configPath, normalizeUrl, readConfig, unsetConfig, writeConfig } from "./config.mjs";
import { joinUrl, requestJson } from "./request.mjs";
import { printValue } from "./output.mjs";
import { printError } from "./errors.mjs";
import { suggestCommand } from "./suggestions.mjs";

const commands = new Set(["init", "config", "health", "ready", "summary", "views", "flows", "quality", "alerts", "inventory", "enrich", "export", "metrics", "performance", "benchmarks", "events", "api"]);

function optsFor(opts) { return { json: Boolean(opts.json), jq: opts.jq, template: opts.template }; }
function printResult(body, result, output, printer) {
  const value = output.json ? (body && typeof body === "object" && !Array.isArray(body) ? { ...body, _meta: { status: result?.status, durationMs: result?.durationMs } } : { data: body, _meta: { status: result?.status, durationMs: result?.durationMs } }) : body;
  return printValue(value, output, printer);
}
function requireUrl(env, homeDir, fsImpl) { const active = activeUrl({ env, homeDir, fsImpl }); if (!active.url) throw new Error("No API URL configured. Run: ipfix init <url>"); return active; }
async function get(path, { env, homeDir, fsImpl, timeoutMs, fetchImpl }) { const { url } = requireUrl(env, homeDir, fsImpl); return requestJson(joinUrl(url, path), { timeoutMs, fetchImpl }); }
function pathFor(resource, args, opts) {
  const query = new URLSearchParams();
  const map = { source: "source", destination: "destination", exporter: "exporter", vm: "vm", sourceVm: "sourceVm", destinationVm: "destinationVm", mac: "mac", protocol: "protocol", port: "port", asn: "asn", hours: "hours", limit: "limit", format: "format", includeTest: "includeTest" };
  for (const [key, name] of Object.entries(map)) if (opts[key] !== undefined) query.set(name, opts[key] === true ? "1" : opts[key]);
  if (resource === "flows" && args[1] === "get") return `/api/flow/${encodeURIComponent(opts.id || args[2] || "")}`;
  const base = resource === "export" ? "/api/export" : resource === "metrics" ? "/metrics" : `/api/${resource}`;
  return query.size ? `${base}?${query}` : base;
}

export async function run({ argv = process.argv.slice(2), env = process.env, printer = console, homeDir = os.homedir(), fsImpl, fetchImpl = fetch, exit = (code) => { process.exitCode = code; } } = {}) {
  const { args, opts } = parseArgs(argv); const json = Boolean(opts.json); const output = optsFor(opts);
  if (opts.version || opts.v) return printer.log(VERSION);
  if (!args.length || opts.help || opts.h) return printHelp(printer, args[0]);
  const resource = args[0];
  try {
    if (resource === "init") {
      const url = normalizeUrl(args[1]); if (!url) throw new Error("Usage: ipfix init <url>");
      const result = await requestJson(joinUrl(url, "/ready"), { fetchImpl });
      if (!result.body?.ready && result.body?.status !== "ok") throw new Error("API is not ready");
      const file = writeConfig(url, { homeDir, fsImpl }); return printResult({ url, config: file, ready: true }, result, output, printer);
    }
    if (resource === "config") {
      const action = args[1] || "show";
      if (action === "path") return printer.log(configPath(homeDir));
      if (action === "unset") { unsetConfig({ homeDir, fsImpl }); return json ? printer.log(JSON.stringify({ unset: true })) : printer.log("Configuration removed"); }
      if (action === "show") { const saved = readConfig({ homeDir, fsImpl }); const current = activeUrl({ env, homeDir, fsImpl }); return printValue({ ...saved, activeUrl: current.url, source: current.source }, output, printer); }
      throw new Error(`Unknown config action: ${action}`);
    }
    if (!commands.has(resource)) { const suggestion = suggestCommand(resource); throw new Error(`Unknown command "${resource}"${suggestion ? `. Did you mean "${suggestion}"?` : ""}. Run ipfix --help`); }
    if (resource === "api") { const path = args[1]; if (!path) throw new Error("Usage: ipfix api <path>"); const result = await get(path, { env, homeDir, fsImpl, fetchImpl }); return printResult(result.body, result, output, printer); }
    if (resource === "events") return streamEvents({ env, homeDir, fsImpl, fetchImpl, json, printer, opts });
    const apiResource = resource === "health" ? "health" : resource === "ready" ? "ready" : resource === "enrich" ? "ip-enrichment" : resource;
    let path = pathFor(apiResource, args, opts);
    if (resource === "enrich") { if (!opts.ip) throw new Error("Usage: ipfix enrich --ip <address>"); path += `?ip=${encodeURIComponent(opts.ip)}`; }
    const result = await get(path, { env, homeDir, fsImpl, fetchImpl });
    return printResult(result.body, result, output, printer);
  } catch (error) { printError(error, { json, printer, context: { command: resource } }); exit(1); }
}

export function parseSseChunk(chunk) {
  return chunk.split("\n").filter(line => line.startsWith("data:")).map(line => JSON.parse(line.slice(5).trim()));
}

async function streamEvents({ env, homeDir, fsImpl, fetchImpl, json, printer, opts }) {
  const { url } = requireUrl(env, homeDir, fsImpl); const response = await fetchImpl(joinUrl(url, `/api/events${opts.hours ? `?hours=${encodeURIComponent(opts.hours)}` : ""}`));
  if (!response.ok) throw new Error(`API request failed with HTTP ${response.status}`);
  if (!response.body?.getReader) throw new Error("Streaming events are unavailable in this runtime");
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
  while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const chunks = buffer.split("\n\n"); buffer = chunks.pop(); for (const value of chunks.flatMap(parseSseChunk)) printer.log(json ? JSON.stringify(value) : `${value.totals?.flows ?? 0} flows, ${value.totals?.bytes ?? 0} bytes`); }
}
