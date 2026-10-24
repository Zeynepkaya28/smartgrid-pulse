# Ölçümler

Tüm sayılar yerel Docker yığınında (`pnpm run up`) ölçüldü:
Intel Core i7-13620H (16 iş parçacığı), 32 GB RAM, Windows 11 + Docker Desktop (WSL 2,
16 CPU / 15,5 GiB). Tarih: 25 Ekim 2026.

## 1. Yük testi: 200 cihaz × 2 Hz (400 mesaj/sn)

```bash
DEVICE_COUNT=200 PUBLISH_HZ=2 DURATION_S=600 bash scripts/loadtest.sh out/
py -3.12 scripts/bench/analyze_loadtest.py out/
```

Gecikme = cihazın `ts` damgası → satırın Postgres'te commit edilmesi (worker'ın 30 sn'lik
`metrics` log olayından). CPU/bellek `docker stats` ile 10 sn'de bir örneklendi.

### Bulunan sorun ve düzeltme

İlk koşuda iki pencerede gecikme 20 saniyeye çıktı. Neden: 200 cihaz aynı anda başladığı için
hepsi Isolation Forest eğitim eşiğine (180 örnek, sonra her 600 örnek) aynı saniyede ulaştı;
188 eğitim birden thread havuzuna düştü ve GIL'i tutan model derleme adımı MQTT/flush döngüsünü
saniyelerce aç bıraktı. Düzeltme: eğitimler tek iş parçacıklı ayrı bir havuzda, saniyede en fazla
2 yeni iş (`TRAININGS_PER_TICK`). 200 modelin ilk eğitimi ~100 sn'ye yayılır; o sürede eski model
(yoksa z-skor ve limitler) çalışmaya devam eder.

| Metrik | Düzeltme öncesi (10 dk) | **Düzeltme sonrası (9,5 dk)** |
|---|---|---|
| Hedef hız | 400 msg/s | 400 msg/s |
| Worker'a ulaşan (ort. / en düşük 30 sn pencere) | 400 / 213 msg/s | **400 / 400 msg/s** |
| Yazılan satır | 228.800 | 213.800 |
| Düşen satır / geçersiz mesaj | 0 / 0 | **0 / 0** |
| Ingest gecikmesi p50 (pencerelerin medyanı) | 566 ms | **566 ms** |
| Ingest gecikmesi p95 (en kötü pencere) | 19.237 ms | **1.334 ms** |
| Ingest gecikmesi max | 20.237 ms | **3.069 ms** |
| COPY flush ort. / max | 34,4 / 878 ms | **16,9 / 90 ms** |
| En fazla tamponda bekleyen satır | 546 | 400 |
| Hazır Isolation Forest modeli | 200 / 200 | 200 / 200 |

p50 ≈ 0,5 sn tasarım gereğidir: worker satırları 1 saniyelik partiler halinde `COPY` ile yazar.

| Konteyner | CPU ort. | CPU p95 | Bellek ort. | Bellek max |
|---|---|---|---|---|
| worker (öncesi) | 26,9 % | 118,1 % | 452 MiB | 571 MiB |
| **worker (sonrası)** | **19,6 %** | **33,5 %** | **406 MiB** | **522 MiB** |
| simulator | 8,2 % | 24,8 % | 42 MiB | 42 MiB |
| mosquitto | 1,9 % | 3,7 % | 23 MiB | 23 MiB |
| postgres | 1,6 % | 3,6 % | 301 MiB | 338 MiB |

(CPU %100 = bir çekirdek.) 12 cihazlık normal filo için bu, worker'ın kapasitesinin ~%3'ü demektir.
İkinci koşu kullanıcı isteğiyle 10 yerine 9,5 dakikada durduruldu; iki eğitim dalgasını da kapsar.

## 2. Geçmiş sorgusu: `get_device_history`

```bash
docker exec -i supabase_db_SmartGridPulse psql -U postgres -d postgres < scripts/bench/seed_history.sql
docker exec -i supabase_db_SmartGridPulse psql -U postgres -d postgres < scripts/bench/history_bench.sql
```

Veri: 3 günlük tam saklama penceresi — **3.558.312 ham satır (451 MB, 9 günlük bölüm)** ve
124.976 dakikalık özet satırı. Her aralık 1 ısınma + 30 ölçüm.

| Aralık | Kaynak | Nokta | p50 | p95 | max |
|---|---|---|---|---|---|
| 15d | ham, 5 sn kova | 181 | 0,88 ms | 1,61 ms | 2,38 ms |
| 1s | ham, 15 sn kova | 196 | 1,96 ms | 2,43 ms | 2,70 ms |
| 6s | `telemetry_1m` | 349 | 0,10 ms | 0,13 ms | 0,19 ms |
| 24s | `telemetry_1m`, 5 dk kova | 286 | 0,64 ms | 0,86 ms | 0,97 ms |
| 7g | `telemetry_1m`, 30 dk kova | 337 | 4,26 ms | 5,05 ms | 5,55 ms |

15 dk ve 1 saatlik sorgular partition pruning sayesinde yalnızca bugünün bölümünü tarar
(`EXPLAIN ANALYZE`: "Subplans Removed"; Faz 1). 6s/24s/7g ham tabloya hiç dokunmaz.

## 3. Tespit doğruluğu ve süreleri

**Senaryo testi** (`pnpm --filter @smartgrid/worker scenario`): simülatörün cihaz modeli sahte
saatle, 12 cihaz × (900 sn normal + 420 sn arıza), 3 farklı tohum.

| | seed 2026 | seed 7 | seed 99 |
|---|---|---|---|
| Normal dönemde yanlış alarm / sahte ETA | 0 / 0 | 0 / 0 | 0 / 0 |
| Motor overheat: ilk ETA | 41 s | 52 s | 52 s |
| Motor overheat: uyarı | 64 s | 74 s | 75 s |
| Motor overheat: kritik | 171 s | 130 s | 133 s |

**Canlı uçtan uca** (tarayıcı, gerçek MQTT + worker + Realtime, şiddet 1×):
uyarı 65 s, kritik 170 s, ETA 4 → 1 dk, iki toast + `/alerts` kaydı; "Normale Döndür" sonrası
sağlık 14 → 100, ~110 s. Playwright e2e (şiddet 2×): kritik 109 s.

## 4. Diğer

| Ölçüm | Sonuç |
|---|---|
| Isolation Forest tek örnek puanlama | sklearn `score_samples` 3,9 ms → derlenmiş ağaçlar 0,035 ms (~100×), fark < 1e-15 |
| Senaryo testi süresi (12 cihaz × 1.320 sn, 3 tohum) | ~12 sn |
| `pnpm run up` (imajlar silinmişken) | 244 sn, 4 servis healthy |
| Lighthouse erişilebilirlik | 100 (5 sayfa × açık/koyu) |
| axe WCAG 2.1 AA | 0 ihlal (6 sayfa × açık/koyu) |
| Tarayıcı paketinde gizli anahtar | 0 (service role, MQTT şifresi; sahte değerle grep) |
