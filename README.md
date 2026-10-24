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
