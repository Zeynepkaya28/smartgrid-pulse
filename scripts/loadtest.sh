#!/usr/bin/env bash
# Load test on the local Docker stack (run `pnpm run up` first).
#
#   DEVICE_COUNT=200 PUBLISH_HZ=2 DURATION_S=600 bash scripts/loadtest.sh out_dir
#
# Restarts the simulator with the given fleet size, samples `docker stats` every 10 s,
# keeps the worker's 30 s metrics events, then restores the 12-device simulator.
set -euo pipefail

OUT="${1:-loadtest-out}"
DEVICES="${DEVICE_COUNT:-200}"
HZ="${PUBLISH_HZ:-2}"
DURATION="${DURATION_S:-600}"
COMPOSE=(docker compose -f infra/docker-compose.yml)
DB=supabase_db_SmartGridPulse
mkdir -p "$OUT"

# Compose interpolates the whole file; real keys are only needed by running services.
export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-unused}" SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-unused}"

rows() { docker exec "$DB" psql -U postgres -d postgres -X -qtA -c "select count(*) from public.telemetry"; }

echo "load test: $DEVICES devices x $HZ Hz for $DURATION s"
DEVICE_COUNT="$DEVICES" PUBLISH_HZ="$HZ" "${COMPOSE[@]}" up -d --no-deps simulator >/dev/null
sleep 20 # let new devices register and the worker settle
start_rows=$(rows)
start_ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "start rows=$start_rows at $start_ts"

: > "$OUT/docker_stats.jsonl"
end=$(( $(date +%s) + DURATION ))
while [ "$(date +%s)" -lt "$end" ]; do
  docker stats --no-stream --format '{{json .}}' \
    smartgrid-pulse-worker-1 smartgrid-pulse-simulator-1 smartgrid-pulse-mosquitto-1 "$DB" \
    | sed "s/^/{\"t\":$(date +%s),\"s\":/; s/$/}/" >> "$OUT/docker_stats.jsonl"
  sleep 10
done

end_rows=$(rows)
docker logs --since "$start_ts" smartgrid-pulse-worker-1 2>&1 | grep '"event": "metrics"' > "$OUT/worker_metrics.jsonl" || true
docker logs --since "$start_ts" smartgrid-pulse-worker-1 2>&1 | grep -iE '"level": "(warning|error)"' > "$OUT/worker_warnings.jsonl" || true
echo "{\"devices\":$DEVICES,\"hz\":$HZ,\"duration_s\":$DURATION,\"start_rows\":$start_rows,\"end_rows\":$end_rows}" > "$OUT/summary.json"
cat "$OUT/summary.json"

echo "restoring 12-device simulator"
DEVICE_COUNT=12 PUBLISH_HZ=1 "${COMPOSE[@]}" up -d --no-deps simulator >/dev/null
