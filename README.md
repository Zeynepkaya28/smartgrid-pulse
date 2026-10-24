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

