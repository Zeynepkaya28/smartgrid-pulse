-- 12 virtual devices: 3 of each type. Must match services/simulator/src/simulator/devices.py.
-- Names and sites are user-facing, so they are in Turkish.
insert into public.devices (device_id, name, type, site) values
  ('mt-01', 'Motor MT-01',  'motor',        'Bursa Fabrika A'),
  ('mt-02', 'Motor MT-02',  'motor',        'Bursa Fabrika A'),
  ('mt-03', 'Motor MT-03',  'motor',        'Bursa Fabrika A'),
  ('wt-01', 'Türbin WT-01', 'wind_turbine', 'Aliağa Rüzgar Santrali'),
  ('wt-02', 'Türbin WT-02', 'wind_turbine', 'Aliağa Rüzgar Santrali'),
  ('wt-03', 'Türbin WT-03', 'wind_turbine', 'Aliağa Rüzgar Santrali'),
  ('pm-01', 'Pompa PM-01',  'pump',         'Kocaeli Fabrika B'),
  ('pm-02', 'Pompa PM-02',  'pump',         'Kocaeli Fabrika B'),
  ('pm-03', 'Pompa PM-03',  'pump',         'Kocaeli Fabrika B'),
  ('tr-01', 'Trafo TR-01',  'transformer',  'İzmir Şebeke TM-3'),
  ('tr-02', 'Trafo TR-02',  'transformer',  'İzmir Şebeke TM-3'),
  ('tr-03', 'Trafo TR-03',  'transformer',  'İzmir Şebeke TM-3')
on conflict (device_id) do update set
  name = excluded.name,
  type = excluded.type,
  site = excluded.site;
