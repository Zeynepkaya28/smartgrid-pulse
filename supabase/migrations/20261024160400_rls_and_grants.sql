-- Row level security and grants.
-- Reads: anon + authenticated may SELECT devices, telemetry_1m, device_health,
--        alerts, device_latest and call the read RPCs.
-- Writes: service_role only (the worker). service_role bypasses RLS and keeps
--         Supabase's default grants.
-- Exception: authenticated users may acknowledge alerts.
-- Raw telemetry has no client access at all; it is read through the RPCs.

alter table public.devices       enable row level security;
alter table public.telemetry     enable row level security;
alter table public.telemetry_1m  enable row level security;
alter table public.device_health enable row level security;
alter table public.alerts        enable row level security;

-- Table privileges (default privileges were revoked in the first migration).
grant select on public.devices, public.telemetry_1m, public.device_health, public.alerts
  to anon, authenticated;
grant select on public.device_latest to anon, authenticated;
grant update (acknowledged, acknowledged_by) on public.alerts to authenticated;

-- Read policies.
create policy devices_read on public.devices
  for select to anon, authenticated using (true);

create policy telemetry_1m_read on public.telemetry_1m
  for select to anon, authenticated using (true);

create policy device_health_read on public.device_health
  for select to anon, authenticated using (true);

create policy alerts_read on public.alerts
  for select to anon, authenticated using (true);

-- Acknowledge: column grant limits the update to acknowledged/acknowledged_by,
-- and a user can only record themselves as the acknowledger.
create policy alerts_acknowledge on public.alerts
  for update to authenticated
  using (true)
  with check (acknowledged_by is null or acknowledged_by = (select auth.uid()));

-- RPCs.
grant execute on function public.get_device_history(text, text) to anon, authenticated;
grant execute on function public.get_fleet_stats() to anon, authenticated;

-- Internal job function: never callable through the API.
revoke execute on function public.refresh_telemetry_1m(interval) from public, anon, authenticated;
