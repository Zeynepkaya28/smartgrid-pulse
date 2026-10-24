-- Read API for the dashboard: latest device state view and history/stats RPCs.

-- ---------------------------------------------------------------------------
-- device_latest: every device with its most recent health snapshot.
-- security_invoker = on, so the caller's RLS on devices/device_health applies.
-- ---------------------------------------------------------------------------
create view public.device_latest
with (security_invoker = on) as
select
  d.device_id,
  d.name,
  d.type,
  d.site,
  d.first_seen,
  d.last_seen,
  h.time as health_time,
  h.health_score,
  h.status,
  h.iforest_score,
  h.max_abs_z,
  h.eta_minutes,
  h.eta_metric
from public.devices d
left join lateral (
  select dh.time, dh.health_score, dh.status, dh.iforest_score, dh.max_abs_z, dh.eta_minutes, dh.eta_metric
  from public.device_health dh
  where dh.device_id = d.device_id
  order by dh.time desc
  limit 1
) h on true;

-- ---------------------------------------------------------------------------
-- get_device_history: chart series for one device.
--   15m -> raw telemetry, 5 s buckets   (~180 points)
--   1h  -> raw telemetry, 15 s buckets  (~240 points)
--   6h  -> telemetry_1m as-is           (~360 points)
--   24h -> telemetry_1m, 5 min buckets  (~288 points)
--   7d  -> telemetry_1m, 30 min buckets (~336 points)
-- Re-bucketed averages are weighted by sample count.
-- security definer: anon/authenticated cannot read raw telemetry directly.
-- ---------------------------------------------------------------------------
create or replace function public.get_device_history(p_device text, p_range text)
returns table (
  bucket          timestamptz,
  temperature_avg double precision,
  temperature_max double precision,
  vibration_avg   double precision,
  vibration_max   double precision,
  pressure_avg    double precision,
  pressure_min    double precision,
  current_avg     double precision,
  current_max     double precision,
  samples         integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_now    timestamptz := now();
  v_origin timestamptz := timestamptz '2000-01-01 00:00:00+00';
  v_bin    interval;
  v_window interval;
begin
  if p_range in ('15m', '1h') then
    v_window := case p_range when '15m' then interval '15 minutes' else interval '1 hour' end;
    v_bin    := case p_range when '15m' then interval '5 seconds' else interval '15 seconds' end;

    return query
    select
      date_bin(v_bin, t.time, v_origin) as bucket,
      avg(t.temperature), max(t.temperature),
      avg(t.vibration), max(t.vibration),
      avg(t.pressure), min(t.pressure),
      avg(t.current), max(t.current),
      count(*)::integer
    from public.telemetry t
    where t.device_id = p_device
      and t.time > v_now - v_window
      and t.time <= v_now
    group by 1
    order by 1;

  elsif p_range = '6h' then
    return query
    select
      r.bucket,
      r.temperature_avg, r.temperature_max,
      r.vibration_avg, r.vibration_max,
      r.pressure_avg, r.pressure_min,
      r.current_avg, r.current_max,
      r.samples
    from public.telemetry_1m r
    where r.device_id = p_device
      and r.bucket > v_now - interval '6 hours'
    order by r.bucket;

  elsif p_range in ('24h', '7d') then
    v_window := case p_range when '24h' then interval '24 hours' else interval '7 days' end;
    v_bin    := case p_range when '24h' then interval '5 minutes' else interval '30 minutes' end;

    return query
    select
      date_bin(v_bin, r.bucket, v_origin) as bucket,
      sum(r.temperature_avg * r.samples) / nullif(sum(r.samples), 0), max(r.temperature_max),
      sum(r.vibration_avg * r.samples) / nullif(sum(r.samples), 0), max(r.vibration_max),
      sum(r.pressure_avg * r.samples) / nullif(sum(r.samples), 0), min(r.pressure_min),
      sum(r.current_avg * r.samples) / nullif(sum(r.samples), 0), max(r.current_max),
      sum(r.samples)::integer
    from public.telemetry_1m r
    where r.device_id = p_device
      and r.bucket > v_now - v_window
    group by 1
    order by 1;

  else
    raise exception 'invalid range "%": expected 15m, 1h, 6h, 24h or 7d', p_range
      using errcode = '22023';
  end if;
end;
$$;

comment on function public.get_device_history(text, text) is 'Chart series for one device. p_range: 15m | 1h | 6h | 24h | 7d.';

-- ---------------------------------------------------------------------------
-- get_fleet_stats: headline numbers for the dashboard.
-- Row count is an estimate from pg_class.reltuples (summed over partitions),
-- so it costs nothing on a table with millions of rows.
-- ---------------------------------------------------------------------------
create or replace function public.get_fleet_stats()
returns table (
  device_count            integer,
  messages_per_second     double precision,
  open_alerts             integer,
  telemetry_rows_estimate bigint,
  telemetry_bytes         bigint,
  telemetry_1m_bytes      bigint,
  device_health_bytes     bigint,
  alerts_bytes            bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::integer from public.devices),
    (select count(*)::double precision / 60
       from public.telemetry t
      where t.time > now() - interval '1 minute'
        and t.time <= now()),
    (select count(*)::integer from public.alerts a where not a.acknowledged),
    (select coalesce(sum(greatest(c.reltuples, 0)), 0)::bigint
       from pg_catalog.pg_partition_tree('public.telemetry'::regclass) p
       join pg_catalog.pg_class c on c.oid = p.relid
      where p.isleaf),
    (select coalesce(sum(pg_catalog.pg_total_relation_size(p.relid)), 0)::bigint
       from pg_catalog.pg_partition_tree('public.telemetry'::regclass) p
      where p.isleaf),
    pg_catalog.pg_total_relation_size('public.telemetry_1m'::regclass),
    (select coalesce(sum(pg_catalog.pg_total_relation_size(p.relid)), 0)::bigint
       from pg_catalog.pg_partition_tree('public.device_health'::regclass) p
      where p.isleaf),
    pg_catalog.pg_total_relation_size('public.alerts'::regclass);
$$;

comment on function public.get_fleet_stats() is 'Fleet headline stats: device count, ingest rate, open alerts, estimated rows and table sizes.';
