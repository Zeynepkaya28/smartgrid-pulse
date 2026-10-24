# SmartGrid Pulse

Yüzlerce sanal sensörden MQTT ile zaman serisi verisi toplayan, gerçek zamanlı anomali
tespit eden, kestirimci bakım için "kritik eşiğe kalan süre" tahmini yapan ve Apple tasarım
dilinde bir panel sunan endüstriyel IoT platformu.

> Taslak — Faz 7'de tamamlanacak.

## Yapı

| Klasör | İçerik |
|---|---|
| `apps/dashboard` | Next.js 15 panel (Vercel) |
| `services/simulator` | Python sanal IoT simülatörü (Railway) |
| `services/worker` | Python ingestion + anomali motoru (Railway) |
| `supabase/` | Supabase CLI migration'ları |
| `infra/` | `mosquitto.conf`, `docker-compose.yml` |
| `docs/` | Ek belgeler |
| `prompts/` | Faz promptları ve ilerleme |

Mimari ve gerekçeler: [`prompts/README.md`](prompts/README.md).

## Başlangıç

Gerekenler: Node.js 20+, Docker Desktop, Python 3.12.

pnpm 12 gerekir (corepack bu sürümü henüz çalıştıramıyor):

```bash
npm install -g pnpm@12
pnpm install
pnpm supabase start
```

Yerel Supabase portları 544xx aralığındadır (API `54421`, DB `54422`, Studio `54423`).
Varsayılan 543xx portları başka projelerle çakışmasın, 55xxx aralığındaki
Windows'un ayırdığı portlara da denk gelmesin diye bu aralık seçildi.

### MQTT broker ve simülatör

```bash
docker compose -f infra/docker-compose.yml up -d mosquitto
pnpm --filter @smartgrid/simulator dev
```

Arıza enjekte etmek için:

```bash
docker exec smartgrid-pulse-mosquitto-1 mosquitto_pub -q 1 -t smartgrid/cmd/mt-01/fault -m '{"action":"inject","type":"overheat","intensity":2}'
```

### Worker (ingestion + anomali motoru)

```bash
cp services/worker/.env.example services/worker/.env   # SUPABASE_SERVICE_ROLE_KEY'i `supabase status`'tan doldurun
pnpm --filter @smartgrid/worker dev
pnpm --filter @smartgrid/worker scenario   # 12 cihaz, 900 s normal + 420 s arıza senaryosu
```

### Üretim broker'ı

Proje belirli bir MQTT sağlayıcısına bağlı değildir. Üretimde TLS destekleyen herhangi bir
broker kullanılabilir (ör. EMQX Cloud, HiveMQ veya kendi Mosquitto'nuz). Bağlantı bilgileri
her servisin `.env` dosyasındaki `MQTT_HOST`, `MQTT_PORT=8883`, `MQTT_TLS=true`,
`MQTT_USERNAME` ve `MQTT_PASSWORD` değişkenleriyle verilir.

> Not: HiveMQ Cloud'un ücretsiz Serverless planı 30 Eylül 2026 itibarıyla yeni kullanıcılara
> kapandı, bu yüzden repo hazır bir üretim broker'ı içermez.
