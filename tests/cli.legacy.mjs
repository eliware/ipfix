import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { run } from "../src/cli.mjs";
import { parseSseChunk } from "../src/cli.mjs";
import { requestJson } from "../src/request.mjs";
import { normalizeUrl, writeConfig, activeUrl, configPath } from "../src/config.mjs";
import { selectJson, renderTemplate } from "../src/output.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ipfix-cli-"));
assert.equal(normalizeUrl("https://example.test/"), "https://example.test");
assert.throws(() => normalizeUrl("example.test"));
writeConfig("https://saved.test", { homeDir: tmp });
assert.equal(activeUrl({ homeDir: tmp, env: {} }).url, "https://saved.test");
assert.equal(activeUrl({ homeDir: tmp, env: { IPFIX_URL: "https://env.test" } }).source, "environment");
assert.equal(configPath(tmp).endsWith(path.join(".ipfix", "config.json")), true);
assert.equal(selectJson({ result: { name: "ok" } }, ".result.name"), "ok");
assert.equal(renderTemplate({ name: "ok" }, "{{name}}"), "ok");
assert.deepEqual(parseSseChunk("event: summary\ndata: {\"ok\":true}\n"), [{ ok: true }]);
const slowFetch = (_url, { signal }) => new Promise((resolve, reject) => {
  signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
});
await assert.rejects(() => requestJson("https://slow.test", { timeoutMs: 1, fetchImpl: slowFetch }));
const badFetch = async () => ({ ok: false, status: 503, async text() { return JSON.stringify({ error: "down" }); } });
await assert.rejects(() => requestJson("https://bad.test", { fetchImpl: badFetch }), error => error.status === 503 && error.body.error === "down");

const logs = []; const errors = []; const urls = [];
const fetchImpl = async (url) => {
  urls.push(url);
  return {
    ok: true,
    status: 200,
    async text() {
      return url.endsWith("/ready")
        ? JSON.stringify({ ready: true, status: "ok" })
        : url.includes("/flows")
          ? JSON.stringify({ flows: [] })
          : JSON.stringify({ totals: { flows: 3 }, topTalkers: [] });
    },
  };
};
await run({ argv: ["init", "https://api.test/"], homeDir: tmp, fetchImpl, printer: { log: value => logs.push(value), error: value => errors.push(value) } });
await run({ argv: ["summary", "--json"], homeDir: tmp, fetchImpl, printer: { log: value => logs.push(value), error: value => errors.push(value) } });
assert.equal(errors.length, 0);
assert.equal(JSON.parse(logs.at(-1)).totals.flows, 3);
assert.equal(JSON.parse(logs.at(-1))._meta.status, 200);
await run({ argv: ["flows", "--source", "192.0.2.10", "--sourceVm", "vm-test", "--port", "443", "--hours", "1", "--json"], homeDir: tmp, fetchImpl, printer: { log: value => logs.push(value), error: value => errors.push(value) } });
assert.match(urls.at(-1), /\/api\/flows\?[^ ]*source=192\.0\.2\.10/);
assert.match(urls.at(-1), /port=443/);
assert.match(urls.at(-1), /sourceVm/);
await run({ argv: ["performance", "--json"], homeDir: tmp, fetchImpl, printer: { log: value => logs.push(value), error: value => errors.push(value) } });
assert.equal(urls.at(-1), "https://api.test/api/performance");
await run({ argv: ["metrics"], homeDir: tmp, fetchImpl, printer: { log: value => logs.push(value), error: value => errors.push(value) } });
assert.equal(urls.at(-1), "https://api.test/metrics");
console.log("CLI tests passed: config, output, init, and summary");
