# Faz 6 — Docker Compose (lokal) ve deploy

Lokalde tek komut, üretimde dört platform: aynı imajlar ve aynı env değişken adları iki
ortamda da kullanılır.

## Prompt

```text
Faz 6: Tam Docker entegrasyonu ve deploy.

LOKAL (infra/docker-compose.yml):
- Servisler: mosquitto (1883 + 9001 websockets, healthcheck mosquitto_sub ile),
  simulator, worker, dashboard (Next.js standalone çıktı, çok aşamalı Dockerfile,
  non-root). depends_on + condition: service_healthy.
- Supabase lokal stack'i "supabase start" ile ayrı çalışır; servisler ona
  host.docker.internal:54322 (DB) ve :54321 (API/Realtime) üzerinden bağlansın
  (Linux için extra_hosts: host-gateway; Windows Docker Desktop'ta zaten çalışır).
- Kök package.json script'leri (Windows uyumlu): "up" (supabase start + compose up),
  "down", "reset-db", "logs".
- .env.example'ları lokal değerlerle doldur; "pnpm up" sonrası localhost:3000 çalışsın.

ÜRETİM:
- Supabase: "supabase link" + "supabase db push". pg_partman/pg_cron eklentilerinin
  dashboard'dan açık olduğunu kontrol eden bir SQL doğrulama scripti yaz.
- HiveMQ Cloud: iki kullanıcı oluştur — "device" (smartgrid/+/+/telemetry yazma,
  smartgrid/cmd/# okuma) ve "backend" (worker + Vercel komutları). README'de adımlar.
- Railway: simulator ve worker için iki servis, Dockerfile'dan build, healthcheck /healthz,
  env: MQTT_* , DATABASE_URL (Supavisor session pooler), SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY. (Alternatif: fly.toml dosyalarını da üret.)
- Vercel: root directory apps/dashboard; env NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (yalnız server),
  MQTT_URL, MQTT_USERNAME, MQTT_PASSWORD. Supabase Auth redirect URL'lerine Vercel
  domain'ini ve preview domainlerini ekle.

CI (GitHub Actions):
- PR: ruff, mypy, pytest (worker senaryo testi dahil), pnpm lint, tsc, next build.
- main: supabase db push (SUPABASE_ACCESS_TOKEN + DB şifresi secret), Railway deploy
  (railway up veya otomatik GitHub entegrasyonu); Vercel kendi Git entegrasyonuyla.

Deploy sonrası smoke test scripti: Realtime'dan 10 sn içinde "state" event'i alınıyor mu,
/api/sim yetkisiz 401 dönüyor mu, get_fleet_stats cihaz sayısı 12 mi.
```

## Bitti kontrol listesi

- [ ] `pnpm up` temiz makinede çalışıyor
- [ ] Üretim URL'sinde canlı kartlar güncelleniyor
- [ ] Smoke test CI'da yeşil
