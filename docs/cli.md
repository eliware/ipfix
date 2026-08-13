# ipfix CLI

`ipfix` is a read-only command-line client for an `ipfixd` HTTP API. It is
intended for humans and AI coding agents diagnosing network flow data.

## Setup

```bash
ipfix init https://collector.example.invalid
ipfix config show
```

Initialization verifies `/ready` and writes `~/.ipfix/config.json`. The saved
URL can be overridden for one command or session with `IPFIX_URL`.

## Commands

```text
ipfix health       Collector and database health
ipfix ready        Readiness status
ipfix summary      Flow totals and top talkers
ipfix views        Aggregated flow views
ipfix flows        List or inspect flows
ipfix quality      Data-quality metrics
ipfix alerts       Active alerts
ipfix inventory    Inventory status
ipfix enrich       IP enrichment lookup
ipfix export       CSV or JSON flow export
ipfix metrics      Prometheus metrics
ipfix performance  Query, rollup, and backup diagnostics
ipfix benchmarks   Recorded API benchmark results
ipfix events       Live SSE events
ipfix api <path>   Read-only GET passthrough
```

All commands support `--json`, `--jq`, and `--template`. JSON responses include
`_meta.status` and `_meta.durationMs` where a request was made. Errors use a
nonzero exit code and structured JSON when `--json` is selected.

Examples:

```bash
ipfix summary
ipfix summary --json --jq '.totals'
ipfix flows --source 192.0.2.10 --hours 1 --limit 20 --json
ipfix flows --sourceVm vm-test --destinationVm vm-peer --port 443 --json
ipfix flows get --id 12345 --json
ipfix enrich --ip 8.8.8.8 --json
ipfix export --format json --hours 1 > flows.json
ipfix api /api/summary --json
ipfix performance --json
ipfix benchmarks --json
ipfix events --json
```

`events --json` emits one JSON object per line so agents can process the live
stream incrementally.

## Troubleshooting

- Missing configuration: run `ipfix init <url>` or set `IPFIX_URL`.
- Readiness failure: check that the daemon is running and `/ready` responds.
- HTTP errors: use `--json` to capture `error`, `status`, and `detail` fields.
- Slow requests: inspect `_meta.durationMs`; the API caches expensive queries.
- Metrics output is Prometheus text, not JSON.
- Performance diagnostics are available through `/api/performance` and include
  query timings, rollup row counts, and backup status.
- `events` is a continuous stream and should be stopped with Ctrl-C or a
  process timeout in automation.
