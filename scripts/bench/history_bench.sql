-- get_device_history latency per range: 30 timed runs after one warm-up.
--   docker exec -i supabase_db_SmartGridPulse psql -U postgres -d postgres -f - < scripts/bench/history_bench.sql

set statement_timeout = 0;
create temp table bench (range text, ms double precision);

do $$
declare
  r text;
  i integer;
  t0 timestamptz;
begin
  foreach r in array array['15m', '1h', '6h', '24h', '7d'] loop
    perform count(*) from public.get_device_history('mt-01', r);
    for i in 1..30 loop
      t0 := clock_timestamp();
      perform count(*) from public.get_device_history('mt-01', r);
      insert into bench values (r, extract(epoch from clock_timestamp() - t0) * 1000);
    end loop;
  end loop;
end;
$$;

select
  b.range,
  (select count(*) from public.get_device_history('mt-01', b.range)) as points,
  round(percentile_cont(0.5) within group (order by b.ms)::numeric, 2) as p50_ms,
  round(percentile_cont(0.95) within group (order by b.ms)::numeric, 2) as p95_ms,
  round(max(b.ms)::numeric, 2) as max_ms
from bench b
group by b.range
order by array_position(array['15m', '1h', '6h', '24h', '7d'], b.range);

select (select count(*) from public.telemetry) as raw_rows,
       (select count(*) from public.telemetry_1m) as rollup_rows,
       (select count(*) from pg_partition_tree('public.telemetry'::regclass) where isleaf) as raw_partitions;
