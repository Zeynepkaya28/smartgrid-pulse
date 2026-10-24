# Portföy özeti

## LinkedIn / CV (3 madde)

- **Gerçek zamanlı endüstriyel IoT platformu kurdum:** MQTT → Python asyncio worker → Supabase
  Postgres 17 → Next.js; 200 cihaz × 2 Hz (400 mesaj/sn) yükte sıfır veri kaybı, ingest p50
  566 ms / p95 1,3 s; 3,5 milyon satırlık geçmişte sorgular p95 < 6 ms (pg_partman + pg_cron ile
  TimescaleDB'siz zaman serisi).
- **Kestirimci bakım için anomali motoru tasarladım:** kapılı kayan z-skor, cihaz başına kalibre
  edilmiş Isolation Forest ve eğilimden "kritik eşiğe kalan süre"; 12 cihazlık simülasyonda normal
  çalışmada 0 yanlış alarm, motor aşırı ısınmasında uyarı 64–75 sn, kritikten önce ETA. Model
  puanlamayı ağaçları derleyerek ~100× hızlandırdım; yük testinde bulduğum eğitim fırtınasını
  gidererek p95 gecikmeyi 19 sn'den 1,3 sn'ye indirdim.
- **Uçtan uca ürün ve altyapı:** Apple HIG tarzı erişilebilir panel (Lighthouse a11y 100, axe 0
  ihlal), Realtime canlı akış, magic link + RLS ile rol bazlı yetki, Docker Compose ile tek komut
  kurulum, GitHub Actions CI/CD (lint, tip, test, imaj, migration, smoke test), Vercel + Supabase.

## Kısa tanıtım (2–3 cümle)

SmartGrid Pulse, sanal endüstriyel cihazlardan saniyede bir gelen sıcaklık, titreşim, basınç ve
akım verisini MQTT ile toplayıp gerçek zamanlı anomali arayan ve arızanın kritik eşiğe ulaşmasına
kaç dakika kaldığını tahmin eden bir bakım panelidir. Python worker, z-skor, Isolation Forest ve
eğilim analizini tek bir sağlık skorunda birleştirir; Next.js panel durumu Supabase Realtime ile
saniyede bir günceller.
