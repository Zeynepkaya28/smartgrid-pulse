-- Operational snapshot for the dashboard's hidden /status page.
-- security definer: partman and cron schemas are not visible to API roles. Returns
-- only counts and timestamps (nothing user-specific), so anon may call it.

create or replace function public.get_system_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_partitions jsonb;
  v_cron jsonb;
begin
  select coalesce(jsonb_agg(p order by p->>'parent'), '[]'::jsonb) into v_partitions
  from (
    select jsonb_build_object(
      'parent', c.parent_table,
      'retention', c.retention,
      'premake', c.premake,
      'count', (select count(*) from partman.show_partitions(c.parent_table)),
      'oldest', (select min(s.partition_tablename) from partman.show_partitions(c.parent_table) s),
      'newest', (select max(s.partition_tablename) from partman.show_partitions(c.parent_table) s)
    ) as p
    from partman.part_config c
  ) parts;

  select coalesce(jsonb_agg(j order by j->>'jobname'), '[]'::jsonb) into v_cron
  from (
    select jsonb_build_object(
      'jobname', job.jobname,
      'schedule', job.schedule,
      'active', job.active,
      'last_status', last.status,
      'last_run', last.start_time
    ) as j
    from cron.job job
    left join lateral (
      select d.status, d.start_time
      from cron.job_run_details d
      where d.jobid = job.jobid
      order by d.start_time desc
      limit 1
    ) last on true
  ) jobs;

  return jsonb_build_object(
    'now', v_now,
    'last_telemetry_at', (
      select max(t.time) from public.telemetry t
      where t.time > v_now - interval '1 day' and t.time <= v_now + interval '1 minute'
    ),
    'last_rollup_at', (select max(r.bucket) from public.telemetry_1m r),
    'last_health_at', (
      select max(h.time) from public.device_health h
      where h.time > v_now - interval '1 day' and h.time <= v_now + interval '1 minute'
    ),
    'devices_total', (select count(*) from public.devices),
    'devices_seen_1m', (select count(*) from public.devices d where d.last_seen > v_now - interval '1 minute'),
    'partitions', v_partitions,
    'cron', v_cron
  );
end;
$$;

comment on function public.get_system_status() is 'Freshness, partitions and cron health for the /status page.';

grant execute on function public.get_system_status() to anon, authenticated;
