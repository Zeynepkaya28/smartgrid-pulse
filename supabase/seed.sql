-- 12 virtual devices: 3 of each type across 3 sites.
-- Names are user-facing, so they are in Turkish.
insert into public.devices (device_id, name, type, site) values
  ('mt-01', 'Motor 01',          'motor',        'istanbul'),
  ('mt-02', 'Motor 02',          'motor',        'izmir'),
  ('mt-03', 'Motor 03',          'motor',        'ankara'),
  ('wt-01', 'Rüzgâr Türbini 01', 'wind_turbine', 'istanbul'),
  ('wt-02', 'Rüzgâr Türbini 02', 'wind_turbine', 'izmir'),
  ('wt-03', 'Rüzgâr Türbini 03', 'wind_turbine', 'ankara'),
  ('pm-01', 'Pompa 01',          'pump',         'istanbul'),
  ('pm-02', 'Pompa 02',          'pump',         'izmir'),
  ('pm-03', 'Pompa 03',          'pump',         'ankara'),
  ('tr-01', 'Trafo 01',          'transformer',  'istanbul'),
  ('tr-02', 'Trafo 02',          'transformer',  'izmir'),
  ('tr-03', 'Trafo 03',          'transformer',  'ankara')
on conflict (device_id) do nothing;
