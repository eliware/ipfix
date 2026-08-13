export function parseArgs(argv) {
  const args = [];
  const opts = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      args.push(value);
      continue;
    }
    const equals = value.indexOf("=");
    if (equals !== -1) {
      opts[value.slice(2, equals)] = value.slice(equals + 1);
      continue;
    }
    const key = value.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      opts[key] = next;
      index += 1;
    } else {
      opts[key] = true;
    }
  }
  return { args, opts };
}
