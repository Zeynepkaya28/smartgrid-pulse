# SmartGrid Pulse

Yüzlerce sanal sensörden MQTT ile zaman serisi verisi toplayan, gerçek zamanlı anomali
tespit eden, kestirimci bakım için "kritik eşiğe kalan süre" tahmini yapan ve Apple tasarım
dilinde bir panel sunan endüstriyel IoT platformu.

> Taslak — Faz 7'de tamamlanacak.

## Yapı

| Klasör | İçerik |
|---|---|
| `apps/dashboard` | Next.js 15 panel (Vercel) |
| `services/simulator` | Python sanal IoT simülatörü |
| `services/worker` | Python ingestion + anomali motoru |
| `supabase/` | Migration'lar, seed, üretim doğrulama script'leri |
| `infra/` | `docker-compose.yml`, `mosquitto.conf`, broker ACL örneği |
| `scripts/` | Yerel yığın (`stack.mjs`) ve smoke test (`smoke.mjs`) |
| `prompts/` | Faz promptları ve ilerleme |

Mimari ve gerekçeler: [`prompts/README.md`](prompts/README.md).

## Hızlı başlangıç (Docker)

Gerekenler: Node.js 22+, Docker Desktop. pnpm 12 gerekir (corepack bu sürümü henüz
çalıştıramıyor):

```bash
npm install -g pnpm@12
pnpm install
pnpm run up
```

`pnpm run up` yerel Supabase'i başlatır, anahtarlarını okur ve broker, simülatör, worker ve
paneli Docker'da derleyip sağlıklı olana kadar bekler. Panel: http://localhost:3000
(3000 doluysa `DASHBOARD_PORT=3100 pnpm run up`).

> `pnpm up` (run'sız) pnpm'in kendi `update` komutudur; bu yüzden `pnpm run up`.

| Komut | Ne yapar |
|---|---|
| `pnpm run up` | Supabase + Docker Compose yığınını başlatır |
| `pnpm run down` | Compose'u ve Supabase'i durdurur (veri korunur) |
| `pnpm run reset-db` | Migration'ları ve seed'i baştan uygular |
| `pnpm run logs` | Servis loglarını izler |

Yerel adresler: Supabase Studio http://127.0.0.1:54423 · Giriş e-postaları (Mailpit)
http://127.0.0.1:54424 · MQTT `localhost:1883` (WebSocket `9001`).

Yerel Supabase portları 544xx aralığındadır (API `54421`, DB `54422`). Varsayılan 543xx
portları başka projelerle çakışmasın, Windows'un ayırdığı 55xxx aralığına da denk gelmesin
diye seçildi.

## Geliştirme (Docker'sız)

```bash
pnpm supabase start
docker compose -f infra/docker-compose.yml up -d mosquitto
pnpm --filter @smartgrid/simulator dev
pnpm --filter @smartgrid/worker dev           # services/worker/.env.example → .env
pnpm --filter @smartgrid/dashboard dev        # apps/dashboard/.env.example → .env.local, :3100
```

Testler:

```bash
pnpm lint && pnpm test                            # ruff, mypy, pytest, tsc, eslint
pnpm --filter @smartgrid/worker scenario          # 12 cihaz, 900 s normal + 420 s arıza
pnpm --filter @smartgrid/dashboard test:ui        # Playwright + axe (yerel yığın açıkken)
node apps/dashboard/scripts/e2e-fault.mjs mt-01   # uçtan uca arıza senaryosu
```

Arıza enjekte etmek için (giriş yapmadan, doğrudan broker'a):

```bash
docker exec smartgrid-pulse-mosquitto-1 mosquitto_pub -q 1 -t smartgrid/cmd/mt-01/fault -m '{"action":"inject","type":"overheat","intensity":2}'
```

Şema değişince tipleri yenileyin: `SUPABASE_DB_PASSWORD=postgres pnpm db:types`.

## Üretim

| Parça | Nerede | Durum |
|---|---|---|
| Panel | Vercel (`apps/dashboard`, Git entegrasyonu) | https://smartgrid-pulse.vercel.app |
| Veritabanı, Auth, Realtime | Supabase (eu-central-1) | Migration'lar CI'da otomatik |
| MQTT broker | Kullanıcının seçimi | Repo hazır broker içermez |
| Simülatör + worker | Railway veya Fly.io (Dockerfile) | Yapılandırma hazır, dağıtılmadı |

Üretimde simülatör ve worker çalışmadığı için canlı veri yalnızca yerelde akar; üretim paneli
veritabanındaki son durumu gösterir ve `/api/sim` "Simülasyon bu ortamda kapalı" (503) döner.

### Supabase

```bash
pnpm supabase link --project-ref <ref>
pnpm supabase db push
psql "<session pooler URL>" -f supabase/scripts/production_settings.sql   # ham veri 1 gün
psql "<session pooler URL>" -f supabase/scripts/verify_production.sql     # pg_partman, pg_cron, RLS
pnpm supabase config push --project-ref <ref>   # Auth: site URL + Vercel yönlendirmeleri
```

`supabase/config.toml` içindeki `[remotes.production]` bloğu yalnızca üretim projesine
uygulanır: site URL'i Vercel adresidir, yönlendirmelere üretim ve preview domainleri eklidir.

Ücretsiz plan 500 MB'tır. 12 cihaz × 1 Hz ham veri günde ~140 MB tuttuğu için üretimde ham
telemetri 1 gün saklanır (lokalde 3 gün); uzun aralık grafikleri 90 günlük dakikalık özetten okunur.

### MQTT broker ve kullanıcılar

TLS (8883) destekleyen herhangi bir broker kullanılabilir (EMQX Cloud, HiveMQ, kendi
Mosquitto'nuz). HiveMQ Cloud'un ücretsiz Serverless planı 30 Eylül 2026'da yeni kullanıcılara
kapandı. İki kullanıcı açın; yetkiler [`infra/mosquitto.acl.example`](infra/mosquitto.acl.example):

| Kullanıcı | Kim kullanır | Yazar | Okur |
|---|---|---|---|
| `device` | simülatör | `smartgrid/+/+/telemetry`, `smartgrid/sim/faults` | `smartgrid/cmd/#` |
| `backend` | worker, Vercel `/api/sim` | `smartgrid/cmd/#`, `smartgrid/alerts` | telemetri, `smartgrid/sim/faults` |

### Simülatör ve worker (Railway)

1. Railway'de yeni proje → iki servis: kök dizin `services/simulator` ve `services/worker`.
   `railway.json` Dockerfile build'i ve `/healthz` healthcheck'ini tanımlar.
2. Ortam değişkenleri:

   | Değişken | Simülatör | Worker |
   |---|---|---|
   | `MQTT_HOST`, `MQTT_PORT=8883`, `MQTT_TLS=true` | ✓ | ✓ |
   | `MQTT_USERNAME` / `MQTT_PASSWORD` | `device` | `backend` |
   | `DATABASE_URL` (Supavisor **session** pooler, 5432) | | ✓ |
   | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | | ✓ |

3. GitHub'da `RAILWAY_TOKEN` secret'ı ve `RAILWAY_ENABLED=true` değişkeni ekleyin;
   `main`'e her push'ta `deploy.yml` iki servisi de `railway up` ile dağıtır.
   Smoke testin Realtime adımını açmak için `SMOKE_SKIP_REALTIME` değişkenini silin.

Fly.io tercih edilirse her serviste `fly.toml` hazırdır (`fly launch --copy-config`).

### Vercel

Root directory `apps/dashboard`. Ortam değişkenleri:

| Değişken | Kapsam |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tarayıcı (anon key, RLS korur) |
| `MQTT_HOST`, `MQTT_PORT`, `MQTT_TLS`, `MQTT_USERNAME`, `MQTT_PASSWORD` | Yalnız sunucu (`/api/sim`, `backend` kullanıcısı) |

Panel service role key kullanmaz; okuma ve alarm onayı kullanıcının oturumu ve RLS ile yapılır.

## CI / CD

| İş akışı | Ne zaman | Adımlar |
|---|---|---|
| `ci.yml` | Her PR ve `main` | ruff, mypy, pytest (senaryo testi dahil) · tsc, eslint, next build · Docker imajları |
| `deploy.yml` | `main`, elle, her gün 06:00 | `supabase db push` + üretim ayarları + doğrulama · (Railway) · smoke test |

Smoke test (`scripts/smoke.mjs`): Realtime'dan 10 sn içinde `state`, yetkisiz `/api/sim` → 401,
`get_fleet_stats` → 12 cihaz. Gerekenler: secret `SUPABASE_DB_URL`; değişkenler `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SMOKE_BASE_URL`, `SMOKE_SKIP_REALTIME`.
