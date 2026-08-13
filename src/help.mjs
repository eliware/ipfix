export function printHelp(printer = console, command) {
  if (command) {
    printer.log(`Usage: ipfix ${command} [flags]\n\nUse --json for machine-readable output. Run ipfix --help for the full command list.`);
    return;
  }
  printer.log(`Usage: ipfix <command> [flags]

Read-only command-line client for the ipfixd API.

Core commands:
  init <url>       Configure and verify an ipfixd API URL
  config           Inspect local CLI configuration
  health           Show collector and database health
  ready            Check API readiness
  summary          Show flow totals and top talkers
  views            Show aggregated flow views
  flows            List or inspect flows
  quality          Show data-quality metrics
  alerts           Show active alerts
  inventory        Show inventory status
  enrich           Look up IP enrichment
  export           Export flow data
  metrics          Show Prometheus metrics
  performance      Show query, rollup, and backup diagnostics
  benchmarks       Show recorded API benchmark results
  events           Stream live events
  api <path>       Make a read-only GET request to an API path

Global flags:
  --help, -h       Show help
  --version, -v    Show version
  --json           Emit JSON output
  --jq <query>     Select fields from JSON output
  --template <t>   Render a JSON template

Run ipfix <command> --help for command-specific help.`);
}
