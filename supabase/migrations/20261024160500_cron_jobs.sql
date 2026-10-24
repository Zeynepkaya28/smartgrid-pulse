-- Scheduled jobs. cron.schedule upserts by job name, so this file is re-runnable.

-- Create upcoming partitions and drop expired ones (telemetry 3 days, device_health 30 days).
select cron.schedule(
  'partman-maintenance',
  '0 * * * *',
  $$call partman.run_maintenance_proc()$$
);

-- Refresh the 1-minute rollup from the last 5 minutes of raw telemetry.
select cron.schedule(
  'refresh-telemetry-1m',
  '* * * * *',
  $$select public.refresh_telemetry_1m()$$
);

-- 90-day retention for the rollup (daily at 03:15 UTC).
select cron.schedule(
  'telemetry-1m-retention',
  '15 3 * * *',
  $$delete from public.telemetry_1m where bucket < now() - interval '90 days'$$
);
