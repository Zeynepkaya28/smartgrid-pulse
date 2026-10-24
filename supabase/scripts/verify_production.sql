-- Production readiness check. Fails (non-zero exit with ON_ERROR_STOP) on any problem.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/scripts/verify_production.sql
--
-- pg_partman and pg_cron must be enabled (Dashboard → Database → Extensions, or by the
-- first migration). Without pg_cron nothing creates tomorrow's partitions, refreshes the
-- 1-minute rollup or enforces retention.

\set QUIET on
\pset footer off

do $$
declare
  missing text;
  n integer;
begin
  -- 1. Extensions
  select string_agg(e, ', ') into missing
  from unnest(array['pg_partman', 'pg_cron']) as e
  where not exists (select 1 from pg_extension where extname = e);
  if missing is not null then
    raise exception 'missing extensions: % (enable them in the Supabase dashboard)', missing;
  end if;

  -- 2. Scheduled jobs
  select string_agg(j, ', ') into missing
  from unnest(array['partman-maintenance', 'refresh-telemetry-1m', 'telemetry-1m-retention']) as j
  where not exists (select 1 from cron.job where jobname = j and active);
  if missing is not null then
    raise exception 'missing or inactive pg_cron jobs: %', missing;
  end if;

  -- 3. Partition management
  select count(*) into n from partman.part_config
  where parent_table in ('public.telemetry', 'public.device_health');
  if n <> 2 then
    raise exception 'pg_partman manages % of 2 partitioned tables', n;
  end if;

  -- 4. Tomorrow already has a telemetry partition (maintenance is running)
  select count(*) into n
  from pg_catalog.pg_partition_tree('public.telemetry'::regclass) p
  join pg_class c on c.oid = p.relid
  where p.isleaf
    and pg_get_expr(c.relpartbound, c.oid) like '%' || to_char(now() + interval '1 day', 'YYYY-MM-DD') || '%';
  if n = 0 then
    raise exception 'no telemetry partition for tomorrow: run call partman.run_maintenance_proc()';
  end if;

  -- 5. Row level security on every API table
  select string_agg(relname, ', ') into missing
  from pg_class
  where relnamespace = 'public'::regnamespace
    and relname in ('devices', 'telemetry', 'telemetry_1m', 'device_health', 'alerts')
    and not relrowsecurity;
  if missing is not null then
    raise exception 'RLS disabled on: %', missing;
  end if;

  raise notice 'OK: extensions, cron jobs, partitions and RLS look good';
end;
$$;

select jobname, schedule, active from cron.job order by jobname;
select extname, extversion from pg_extension where extname in ('pg_partman', 'pg_cron') order by 1;
