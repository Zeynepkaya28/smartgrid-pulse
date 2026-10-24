# SmartGrid Pulse — Claude Code bağlamı

Sen kıdemli bir full-stack ve veri mühendisisin. Birlikte "SmartGrid Pulse" adlı bir
endüstriyel IoT platformu inşa ediyoruz: yüzlerce sanal sensörden gelen zaman serisi
verisini MQTT ile toplayan, gerçek zamanlı anomali tespit eden, kestirimci bakım için
"kritik eşiğe kalan süre" tahmini yapan ve Apple tasarım dilinde bir panel sunan sistem.

## Nasıl çalışıyoruz

- Proje 8 fazda ilerler. Her fazın promptu `prompts/` klasöründedir
  (`faz-0-iskelet.md` … `faz-7-test-portfoy.md`).
- Kullanıcı "Faz N'yi uygula" dediğinde: ilgili dosyayı oku, prompttaki her maddeyi uygula,
  dosyanın sonundaki "Bitti kontrol listesi"ni tek tek doğrula, sonucu `prompts/PROGRESS.md`
  dosyasında işaretle ve kısa bir özet ver.
- Bir faz bitmeden sonrakine geçme. Önceki fazın kontrol listesi eksikse önce onu tamamla.
- Mimari ve gerekçeler: `prompts/README.md`.

## Teknoloji kararları (değiştirme, önce sor)

- Monorepo (pnpm workspaces):
  - `apps/dashboard` — Next.js 15 App Router, TypeScript strict, Tailwind CSS, Recharts
  - `services/simulator` — Python 3.12, asyncio, aiomqtt
  - `services/worker` — Python 3.12, asyncpg, numpy, scikit-learn
  - `supabase/` — Supabase CLI migrations
  - `infra/` — mosquitto.conf, docker-compose.yml
- Veritabanı: Supabase Postgres 17. TimescaleDB YOK (Supabase'de PG17'de kullanımdan
  kaldırıldı). Zaman serisi için yerel range partitioning + pg_partman + pg_cron.
  Gruplama için `date_bin()`.
- Mesajlaşma: MQTT 3.1.1/5. Lokalde Eclipse Mosquitto, üretimde HiveMQ Cloud (TLS 8883).
- Canlı veri: worker → Supabase Realtime Broadcast (kanal `fleet`) → tarayıcı.
  Tarayıcı MQTT broker'a hiç bağlanmaz.
- Simülasyon komutları: Vercel Route Handler → MQTT (QoS1) → simülatör.
- Deploy: dashboard Vercel'e, simulator + worker Railway'e (Dockerfile ile), DB Supabase'e.
- Lokal: tek `infra/docker-compose.yml` (mosquitto, simulator, worker, dashboard) + `supabase start`.

## MQTT topik sözleşmesi

| Topik | QoS | İçerik |
|---|---|---|
| `smartgrid/{site}/{device_id}/telemetry` | 0 | JSON `{device_id, name, type, site, ts(ms), seq, temperature(°C), vibration(mm/s RMS), pressure(bar), current(A)}` |
| `smartgrid/cmd/{device_id}/fault` | 1 | `{action: "inject" \| "clear", type?, intensity?}` |
| `smartgrid/cmd/all/reset` | 1 | boş |
| `smartgrid/sim/faults` | 1, retained | aktif arıza haritası |
| `smartgrid/alerts` | 1 | worker'ın ürettiği alarmlar |

## Kurallar

- Her fazı küçük, çalışan adımlarla yap; her adımdan sonra çalıştırıp doğrula.
- Gizli anahtarlar yalnızca `.env` dosyalarında; `.env.example` her serviste güncel kalsın.
  `SUPABASE_SERVICE_ROLE_KEY` asla `NEXT_PUBLIC_` ile başlamaz, asla tarayıcıya gitmez.
- Python: ruff + mypy uyumlu, tip ipuçları zorunlu. TypeScript: `any` yasak, zod ile doğrulama.
- Kullanıcıya görünen metinler Türkçe; kod, yorumlar ve commit mesajları İngilizce.
- Belirsizlikte varsayım yapma; kısa bir soru sor.
- Platform: geliştirici Windows kullanıyor. Script'ler PowerShell ve bash'te çalışsın
  ya da Makefile yerine `package.json` script'leri / `just` tercih et; Docker Desktop varsayılır.
