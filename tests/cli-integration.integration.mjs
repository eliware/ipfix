import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { run } from "../src/cli.mjs";

const server = http.createServer((req, res) => {
  res.setHeader("content-type", req.url === "/metrics" ? "text/plain" : "application/json");
  if (req.url === "/ready") return res.end(JSON.stringify({ status: "ok", ready: true }));
  if (req.url === "/api/health") return res.end(JSON.stringify({ status: "ok", ready: true, integrity: "ok", flows: 42 }));
  if (req.url === "/api/performance") return res.end(JSON.stringify({ queries: { summary: { count: 2, averageMs: 4 } }, maintenance: { rollupRows: 8 }, backups: { count: 1 } }));
  if (req.url === "/metrics") return res.end("ipfixd_packets_total 42\n");
  res.statusCode = 404; res.end(JSON.stringify({ error: "not found" }));
});

await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;
const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "ipfix-cli-integration-"));
const logs = [];
const printer = { log: value => logs.push(value), error: value => { throw new Error(value); } };

await run({ argv: ["init", base, "--json"], homeDir, printer });
await run({ argv: ["health", "--json"], homeDir, printer });
const health = JSON.parse(logs.at(-1));
assert.equal(health.integrity, "ok");
assert.equal(health._meta.status, 200);
await run({ argv: ["performance", "--json"], homeDir, printer });
assert.equal(JSON.parse(logs.at(-1)).maintenance.rollupRows, 8);
await run({ argv: ["metrics"], homeDir, printer });
assert.match(logs.at(-1), /ipfixd_packets_total 42/);

await new Promise(resolve => server.close(resolve));
console.log("CLI integration tests passed: local ready, health, performance, and metrics API");
