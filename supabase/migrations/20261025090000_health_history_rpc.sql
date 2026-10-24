-- 24 h health chart for the dashboard. device_health is written every 5 s, so 24 h is
-- ~17k rows per device: more than PostgREST returns in one page. Aggregate to 5 minutes.

create or replace function public.get_health_history(p_device text, p_hours integer default 24)
returns table (
  bucket       timestamptz,
  health_avg   real,
  health_min   real,
  worst_status text
)
language sql
stable
set search_path = ''
as $$
  select
    date_bin('5 minutes', h.time, timestamptz '2000-01-01 00:00:00+00') as bucket,
    avg(h.health_score)::real,
    min(h.health_score)::real,
    case max(case h.status when 'critical' then 2 when 'warning' then 1 else 0 end)
      when 2 then 'critical' when 1 then 'warning' else 'normal'
    end
  from public.device_health h
  where h.device_id = p_device
    and h.time > now() - make_interval(hours => least(greatest(p_hours, 1), 168))
    and h.time <= now()
  group by 1
  order by 1;
$$;

comment on function public.get_health_history(text, integer) is
  'Health score per 5-minute bucket for one device (default 24 h, max 7 days).';

grant execute on function public.get_health_history(text, integer) to anon, authenticated;
