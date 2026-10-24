"""Summarize a scripts/loadtest.sh run as Markdown tables.

    py -3.12 scripts/bench/analyze_loadtest.py <loadtest_out_dir>
"""

from __future__ import annotations

import json
import re
import statistics
import sys
from pathlib import Path

UNITS = {"B": 1 / 2**20, "KiB": 1 / 1024, "MiB": 1.0, "GiB": 1024.0}
NAMES = {
    "smartgrid-pulse-worker-1": "worker",
    "smartgrid-pulse-simulator-1": "simulator",
    "smartgrid-pulse-mosquitto-1": "mosquitto",
    "supabase_db_SmartGridPulse": "postgres",
}


def mib(text: str) -> float:
    m = re.match(r"([\d.]+)\s*([KMG]?i?B)", text.strip())
    if not m:
        return 0.0
    return float(m.group(1)) * UNITS.get(m.group(2), 1.0)


def pct(values: list[float], p: float) -> float:
    s = sorted(values)
    return s[min(len(s) - 1, round(p / 100 * (len(s) - 1)))]


def main() -> None:
    out = Path(sys.argv[1])
    summary = json.loads((out / "summary.json").read_text(encoding="utf-8"))
    metrics = [json.loads(line) for line in (out / "worker_metrics.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    # Skip the first window: it straddles the switch from 12 to 200 devices.
    steady = metrics[1:] if len(metrics) > 2 else metrics

    stats: dict[str, dict[str, list[float]]] = {}
    for line in (out / "docker_stats.jsonl").read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)["s"]
        name = NAMES.get(row["Name"], row["Name"])
        entry = stats.setdefault(name, {"cpu": [], "mem": []})
        entry["cpu"].append(float(row["CPUPerc"].rstrip("%")))
        entry["mem"].append(mib(row["MemUsage"].split("/")[0]))

    rows = summary["end_rows"] - summary["start_rows"]
    expected = summary["devices"] * summary["hz"] * summary["duration_s"]
    print(f"### Load: {summary['devices']} devices x {summary['hz']} Hz, {summary['duration_s'] // 60} min\n")
    print("| Metric | Value |")
    print("|---|---|")
    print(f"| Target rate | {summary['devices'] * summary['hz']} msg/s |")
    print(f"| Worker received (avg / min of 30 s windows) | {statistics.mean(m['messages_per_s'] for m in steady):.0f} / {min(m['messages_per_s'] for m in steady):.0f} msg/s |")
    print(f"| Rows written to `telemetry` | {rows:,} (expected ~{expected:,}) |")
    print(f"| Dropped rows / invalid messages | {max(m['dropped_rows'] for m in metrics)} / {max(m['invalid_messages'] for m in metrics)} |")
    print(f"| Ingest latency p50 (median of windows) | {statistics.median(m['ingest_latency_ms_p50'] for m in steady):.0f} ms |")
    print(f"| Ingest latency p95 (worst window) | {max(m['ingest_latency_ms_p95'] for m in steady):.0f} ms |")
    print(f"| Ingest latency max | {max(m['ingest_latency_ms_max'] for m in steady):.0f} ms |")
    print(f"| COPY flush avg / max | {statistics.mean(m['flush_ms_avg'] for m in steady):.1f} / {max(m['flush_ms_max'] for m in steady):.1f} ms |")
    print(f"| Max buffered rows | {max(m['buffered_rows'] for m in steady)} |")
    print(f"| Isolation Forest models ready | {steady[-1]['models_ready']} / {steady[-1]['devices']} |")
    print()
    print("| Container | CPU avg | CPU p95 | Memory avg | Memory max |")
    print("|---|---|---|---|---|")
    for name in ("worker", "simulator", "mosquitto", "postgres"):
        if name not in stats:
            continue
        s = stats[name]
        print(
            f"| {name} | {statistics.mean(s['cpu']):.1f} % | {pct(s['cpu'], 95):.1f} % | "
            f"{statistics.mean(s['mem']):.0f} MiB | {max(s['mem']):.0f} MiB |"
        )
    print(f"\nSamples: {len(metrics)} worker metric windows, {len(stats.get('worker', {}).get('cpu', []))} docker stats samples per container.")


if __name__ == "__main__":
    main()
