-- Synthetic history for query benchmarks (LOCAL ONLY — never run against production).
--   docker exec -i supabase_db_SmartGridPulse psql -U postgres -d postgres -f - < scripts/bench/seed_history.sql
--
-- Fills the full retention window the way production would look after a few days:
--   raw telemetry  : 12 devices x 1 Hz x (3 days - 1 h)  ~ 3.1 M rows
--   telemetry_1m   : 12 devices x 1/min x (7 days - 1 h) ~ 120 k rows
-- The last hour is left to the real simulator/worker so live data is untouched.

\timing on
set statement_timeout = 0;

insert into public.telemetry (time, device_id, temperature, vibration, pressure, current)
select ts, d.device_id,
       40 + 8 * sin(extract(epoch from ts) / 180.0 + h) + random(),
       1.6 + 0.2 * random(),
       3.2 + 0.1 * random(),
       30 + 5 * sin(extract(epoch from ts) / 180.0 + h)
from (select device_id, (hashtext(device_id) % 628) / 100.0 as h from public.devices) d,
     generate_series(date_trunc('second', now() - interval '3 days' + interval '5 minutes'),
                     date_trunc('second', now() - interval '1 hour'),
                     interval '1 second') ts;

insert into public.telemetry_1m (bucket, device_id, temperature_avg, temperature_max, vibration_avg,
                                 vibration_max, pressure_avg, pressure_min, current_avg, current_max, samples)
select b, d.device_id, 45, 52, 1.7, 1.9, 3.25, 3.1, 32, 36, 60
from public.devices d,
     generate_series(date_bin('1 minute', now() - interval '7 days', timestamptz '2000-01-01'),
                     now() - interval '1 hour', interval '1 minute') b
on conflict (device_id, bucket) do nothing;

analyze public.telemetry;
analyze public.telemetry_1m;

select (select count(*) from public.telemetry) as raw_rows,
       (select pg_size_pretty(sum(pg_total_relation_size(p.relid)))
          from pg_partition_tree('public.telemetry'::regclass) p where p.isleaf) as raw_size,
       (select count(*) from public.telemetry_1m) as rollup_rows;
