export function selectJson(value, expression) {
  if (!expression || expression === ".") return value;
  return expression.replace(/^\./, "").split(".").filter(Boolean).reduce((current, part) => {
    if (part.endsWith("[]")) return (current?.[part.slice(0, -2)] || []).flatMap(item => item || []);
    if (Array.isArray(current)) return current.map(item => item?.[part]);
    return current?.[part];
  }, value);
}

export function renderTemplate(value, template) {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => {
    const selected = selectJson(value, key.trim().startsWith(".") ? key.trim() : `.${key.trim()}`);
    return selected == null ? "" : String(selected);
  });
}

export function formatValue(value, { json = false, jq, template } = {}) {
  const selected = selectJson(value, jq);
  if (template) return renderTemplate(selected, template);
  if (json || typeof selected !== "object" || selected === null) return typeof selected === "string" ? selected : JSON.stringify(selected, null, 2);
  if (selected.totals && selected.topTalkers) return [`Flows: ${selected.totals.flows ?? 0}`, `Bytes: ${selected.totals.bytes ?? 0}`, `Packets: ${selected.totals.packets ?? 0}`, `Window: ${selected.totals.first ?? "—"} → ${selected.totals.last ?? "—"}`, "", "Top talkers:", ...selected.topTalkers.slice(0, 10).map(row => `${row.source ?? "?"} → ${row.destination ?? "?"}  ${row.bytes ?? 0} bytes  ${row.packets ?? 0} packets`)].join("\n");
  if (Array.isArray(selected.flows)) return ["ID       SOURCE → DESTINATION                 BYTES     PROTOCOL", ...selected.flows.map(row => `${String(row.id ?? "").padEnd(8)} ${(row.source_vm || row.source_ip || "?")} → ${(row.destination_vm || row.destination_ip || "?")}  ${String(row.bytes ?? 0).padEnd(9)} ${row.protocol ?? "?"}`)].join("\n");
  if (selected.status || selected.ready !== undefined) return [`Status: ${selected.status ?? (selected.ready ? "ready" : "not ready")}`, ...(selected.integrity ? [`Database: ${selected.integrity}`] : []), ...(selected.flows !== undefined ? [`Flows: ${selected.flows}`] : [])].join("\n");
  return JSON.stringify(selected, null, 2);
}

export function printValue(value, opts, printer = console) { printer.log(formatValue(value, opts)); }
