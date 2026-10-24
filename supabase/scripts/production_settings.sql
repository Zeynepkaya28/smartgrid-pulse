-- Production-only tuning (idempotent). Applied after `supabase db push` in CI.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/scripts/production_settings.sql
--
-- Supabase free tier = 500 MB. 12 devices x 1 Hz raw telemetry is ~140 MB/day, so the
-- 3-day local retention would sit at the limit; keep 1 day of raw data in production.
-- Long-range charts read telemetry_1m (90 days), so nothing visible is lost.

update partman.part_config
set retention = '1 day'
where parent_table = 'public.telemetry'
  and retention is distinct from '1 day';

-- Drop partitions that are already outside the new window.
call partman.run_maintenance_proc();

select parent_table, retention, premake from partman.part_config order by parent_table;
