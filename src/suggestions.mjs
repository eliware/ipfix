const known = ["init", "config", "health", "ready", "summary", "views", "flows", "quality", "alerts", "inventory", "enrich", "export", "metrics", "performance", "benchmarks", "events", "api"];
export function suggestCommand(value) {
  const candidate = known.find(name => name[0] === value?.[0] && Math.abs(name.length - value.length) <= 2);
  return candidate && candidate !== value ? candidate : null;
}
