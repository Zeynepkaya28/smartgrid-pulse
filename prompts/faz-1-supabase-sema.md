# Faz 1 — Supabase şeması (zaman serisi optimizasyonu)

12 cihaz × 1 Hz günde yaklaşık 1,04 milyon satır üretir; bu yüzden ham veri kısa tutulur,
uzun aralık grafikleri 1 dakikalık özet tablosundan okunur.

## Prompt

```text
Faz 1: supabase/migrations altında zaman serisi şemasını yaz. Postgres 17, TimescaleDB yok.

1) Eklentiler: pg_partman (schema partman), pg_cron.
2) devices(device_id text pk, name, type check in (motor,wind_turbine,pump,transformer),
   site, first_seen, last_seen).
3) telemetry(time timestamptz not null, device_id text not null, temperature, vibration,
   pressure, current double precision) PARTITION BY RANGE(time).
   - partman.create_parent ile GÜNLÜK bölümler, p_premake=3.
   - Retention: 3 gün (partman.part_config.retention, retention_keep_table=false).
   - İndeks: (device_id, time desc) + time üzerinde BRIN.
   - PK yok (append-only); yüksek hızlı COPY için tetikleyici (trigger) ekleme.
4) telemetry_1m (bucket timestamptz, device_id, temperature_avg/max, vibration_avg/max,
   pressure_avg/min, current_avg/max, samples int, PRIMARY KEY(device_id, bucket)).
   - Bunu açıklayarak continuous aggregate yerine kullan: pg_cron her dakika
     refresh_telemetry_1m() fonksiyonunu çağırır; fonksiyon son 5 dakikayı
     date_bin('1 minute', time, '2000-01-01') ile gruplayıp INSERT ... ON CONFLICT DO UPDATE yapar.
   - Retention 90 gün (günlük pg_cron DELETE).
5) device_health (time, device_id, health_score real, status text check in
   (normal,warning,critical), iforest_score, max_abs_z, eta_minutes, eta_metric) günlük
   bölümlü, retention 30 gün.
6) alerts (id bigserial, time, device_id fk, severity, metric, value, zscore, message,
   acknowledged bool default false, acknowledged_by uuid null).
7) device_latest VIEW: devices + LATERAL son device_health satırı (security_invoker=on).
8) RPC get_device_history(p_device text, p_range text) returns table:
   '15m' ve '1h' -> ham telemetry'den date_bin 5s/15s; '6h','24h','7d' -> telemetry_1m.
   Ayrıca get_fleet_stats(): cihaz sayısı, son 1 dk mesaj hızı, açık alarm sayısı,
   toplam satır (pg_class.reltuples ile tahmini), tablo boyutları (pg_total_relation_size).
9) partman.run_maintenance_proc() için saatlik pg_cron job.
10) RLS: tüm tablolarda aç. anon + authenticated: devices, telemetry_1m, device_health,
    alerts, view ve RPC'lerde SELECT. Yazma yalnızca service_role (worker).
    alerts.acknowledged güncellemesi yalnızca authenticated.
11) supabase/seed.sql: 12 cihaz kaydı.

Sonra: "supabase db reset" ile lokalde uygula, EXPLAIN ANALYZE ile
get_device_history('mt-01','24h') sorgusunun yalnızca telemetry_1m'e, '15m'nin
yalnızca bugünün bölümüne dokunduğunu (partition pruning) göster.
```

## Bitti kontrol listesi

- [ ] `supabase db reset` hatasız
- [ ] EXPLAIN çıktısında partition pruning görülüyor
- [ ] pg_cron işleri `cron.job` tablosunda listeleniyor
- [ ] anon anahtarla INSERT reddediliyor
