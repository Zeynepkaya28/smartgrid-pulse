# Faz 7 — Test, gözlemlenebilirlik ve portföy

Son faz projeyi "çalışıyor"dan "gösterilebilir"e taşır: ölçülmüş performans, sorunsuz bir
demo ve anlaşılır bir README.

## Prompt

```text
Faz 7: Kalite, gözlemlenebilirlik ve sunum.

TEST:
- Playwright e2e: ana sayfa yükleniyor, 12 kart var, giriş yapıp mt-01'e overheat
  enjekte et, 180 sn içinde kartın "Kritik" olduğunu ve /alerts'te kayıt oluştuğunu doğrula.
- Yük testi: DEVICE_COUNT=200, PUBLISH_HZ=2 ile 10 dk çalıştır; worker'ın gecikmesini
  (mesaj ts -> DB yazım), CPU ve bellek kullanımını ölç ve docs/benchmarks.md'ye tablo yaz.
- Sorgu performansı: get_device_history her aralık için EXPLAIN ANALYZE süreleri.

GÖZLEMLENEBİLİRLİK:
- Worker ve simulator yapılandırılmış JSON log (structlog).
- Worker 30 sn'de bir metrik logu: mesaj/sn, kuyruk boyu, flush süresi, model sayısı.
- Dashboard'da gizli /status sayfası: son veri zamanı, Realtime durumu, tablo boyutları,
  bölüm sayısı (partman.show_partitions).
- Opsiyonel: Sentry (Next.js + Python).

PORTFÖY:
- README: tek cümlelik değer önerisi, mimari diyagram (Mermaid), "Neden MQTT?",
  "Neden TimescaleDB yerine yerel bölümleme?" (Supabase PG17 gerekçesi ve takaslar),
  anomali algoritmasının açıklaması ve formülleri, benchmark tablosu, kurulum adımları,
  canlı demo linki.
- 30-45 sn demo GIF'i: normal filo -> "Motoru Isıt" -> sarı -> ETA -> kırmızı -> alarm.
- docs/architecture.md: veri akışı, topik sözleşmesi, şema, saklama politikaları tablosu.
- LinkedIn/CV için 3 maddelik özet yaz (ölçülmüş sayılarla).
```

## Bitti kontrol listesi

- [ ] Benchmark tablosu gerçek ölçümlerle dolu
- [ ] README'deki kurulum adımları temiz bir makinede denendi
- [ ] Demo GIF ve canlı link README'de
