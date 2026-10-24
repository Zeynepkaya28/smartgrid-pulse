-- Time-series tables: raw telemetry, 1-minute rollup and device health.
-- 12 devices x 1 Hz is about 1.04M raw rows per day, so raw data is kept short
-- (3 days) and long-range charts read from the 1-minute rollup (90 days).

-- ---------------------------------------------------------------------------
-- Raw telemetry: daily partitions, 3-day retention.
-- Append-only: no primary key, no FK and no triggers so worker COPY stays fast.
-- ---------------------------------------------------------------------------
create table public.telemetry (
  time        timestamptz not null,
  device_id   text not null,
  temperature double precision,
  vibration   double precision,
  pressure    double precision,
  current     double precision
) partition by range (time);

comment on table public.telemetry is 'Raw 1 Hz telemetry. Daily partitions managed by pg_partman, 3-day retention.';

-- Indexes on the parent are created on every partition automatically.
create index telemetry_device_time_idx on public.telemetry (device_id, time desc);
create index telemetry_time_brin_idx on public.telemetry using brin (time);

select partman.create_parent(
  p_parent_table := 'public.telemetry',
  p_control      := 'time',
  p_interval     := '1 day',
  p_premake      := 3
);

update partman.part_config
set retention                = '3 days',
    retention_keep_table     = false,
    retention_keep_index     = false,
    infinite_time_partitions = true -- keep premaking partitions even if ingestion pauses
where parent_table = 'public.telemetry';

-- ---------------------------------------------------------------------------
-- 1-minute rollup.
--
-- Why not a continuous aggregate: that is a TimescaleDB feature, which is not
-- available on Postgres 17. Instead pg_cron calls refresh_telemetry_1m() every
-- minute. It re-aggregates the last 5 minutes and upserts, so late rows and the
-- still-open current minute are corrected on the next runs. The work per run is
-- bounded (about 5 min x 12 devices) and partition pruning keeps it on today's
-- partition.
-- ---------------------------------------------------------------------------
create table public.telemetry_1m (
  bucket          timestamptz not null,
  device_id       text not null,
  temperature_avg double precision,
  temperature_max double precision,
  vibration_avg   double precision,
  vibration_max   double precision,
  pressure_avg    double precision,
  pressure_min    double precision,
  current_avg     double precision,
  current_max     double precision,
  samples         integer not null,
  primary key (device_id, bucket)
);

comment on table public.telemetry_1m is '1-minute rollup of telemetry, refreshed by pg_cron every minute. 90-day retention.';

create index telemetry_1m_bucket_idx on public.telemetry_1m (bucket);

create or replace function public.refresh_telemetry_1m(p_lookback interval default interval '5 minutes')
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_now  timestamptz := now();
  v_from timestamptz := date_bin('1 minute', v_now - p_lookback, timestamptz '2000-01-01 00:00:00+00');
  v_rows integer;
begin
  insert into public.telemetry_1m as r (
    bucket, device_id,
    temperature_avg, temperature_max,
    vibration_avg, vibration_max,
    pressure_avg, pressure_min,
    current_avg, current_max,
    samples
  )
  select
    date_bin('1 minute', t.time, timestamptz '2000-01-01 00:00:00+00'),
    t.device_id,
    avg(t.temperature), max(t.temperature),
    avg(t.vibration), max(t.vibration),
    avg(t.pressure), min(t.pressure),
    avg(t.current), max(t.current),
    count(*)::integer
  from public.telemetry t
  where t.time >= v_from
    and t.time <= v_now
  group by 1, 2
  on conflict (device_id, bucket) do update set
    temperature_avg = excluded.temperature_avg,
    temperature_max = excluded.temperature_max,
    vibration_avg   = excluded.vibration_avg,
    vibration_max   = excluded.vibration_max,
    pressure_avg    = excluded.pressure_avg,
    pressure_min    = excluded.pressure_min,
    current_avg     = excluded.current_avg,
    current_max     = excluded.current_max,
    samples         = excluded.samples;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

comment on function public.refresh_telemetry_1m(interval) is 'Upserts the 1-minute rollup for the last p_lookback. Called by pg_cron every minute.';

-- ---------------------------------------------------------------------------
-- Device health snapshots from the anomaly worker: daily partitions, 30-day retention.
-- ---------------------------------------------------------------------------
create table public.device_health (
  time          timestamptz not null,
  device_id     text not null,
  health_score  real not null,
  status        text not null check (status in ('normal', 'warning', 'critical')),
  iforest_score real,
  max_abs_z     real,
  eta_minutes   real,
  eta_metric    text
) partition by range (time);

comment on table public.device_health is 'Health score, anomaly scores and time-to-threshold estimate per device. 30-day retention.';

create index device_health_device_time_idx on public.device_health (device_id, time desc);

select partman.create_parent(
  p_parent_table := 'public.device_health',
  p_control      := 'time',
  p_interval     := '1 day',
  p_premake      := 3
);

update partman.part_config
set retention                = '30 days',
    retention_keep_table     = false,
    retention_keep_index     = false,
    infinite_time_partitions = true
where parent_table = 'public.device_health';
