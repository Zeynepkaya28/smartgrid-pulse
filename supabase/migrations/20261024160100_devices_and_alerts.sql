-- Device registry and alerts (regular tables, low write volume).

create table public.devices (
  device_id  text primary key,
  name       text not null,
  type       text not null check (type in ('motor', 'wind_turbine', 'pump', 'transformer')),
  site       text not null,
  first_seen timestamptz,
  last_seen  timestamptz
);

comment on table public.devices is 'Virtual IoT devices. first_seen/last_seen are maintained by the worker.';

create table public.alerts (
  id              bigserial primary key,
  time            timestamptz not null default now(),
  device_id       text not null references public.devices (device_id) on delete cascade,
  severity        text not null check (severity in ('warning', 'critical')),
  metric          text not null,
  value           double precision,
  zscore          double precision,
  message         text not null,
  acknowledged    boolean not null default false,
  acknowledged_by uuid references auth.users (id) on delete set null
);

comment on table public.alerts is 'Alerts produced by the anomaly worker. Only acknowledged/acknowledged_by are user-editable.';

create index alerts_time_idx on public.alerts (time desc);
create index alerts_device_time_idx on public.alerts (device_id, time desc);
create index alerts_open_idx on public.alerts (time desc) where not acknowledged;
