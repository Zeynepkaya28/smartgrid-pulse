# İlerleme

Claude Code her fazın sonunda bu dosyayı günceller.

| Faz | Durum | Not |
|---|---|---|
| 0 — İskelet | ✅ Tamamlandı | Monorepo iskeleti, `supabase init`, GitHub repo (public), Supabase projesi (eu-central-1, PG17, linked), Vercel projesi (root: apps/dashboard, GitHub'a bağlı) |
| 1 — Supabase şeması | ✅ Tamamlandı | 6 migration + seed (12 cihaz). `db reset` hatasız; 15m sorgusu yalnızca bugünün bölümünü tarıyor (Subplans Removed), 24h yalnızca telemetry_1m; 3 cron işi `cron.job`'da; anon INSERT 401/42501. Uzak projeye `db push` + seed yapıldı; cron, RLS ve anon erişimi uzakta da doğrulandı |
| 2 — MQTT + simülatör | ✅ Tamamlandı | Mosquitto + simülatör: 12 mesaj/s, inject/clear/reset, retained arıza haritası, yeniden bağlanma, /healthz, Docker (non-root); 36 test, ruff + mypy strict. TLS test.mosquitto.org:8886 üzerinde doğrulandı (12 mesaj/s + uzaktan inject). HiveMQ ücretsiz planı kalktığı için üretim broker'ı kullanıcıya bırakıldı (kullanıcı kararı) |
| 3 — Worker + anomali | ⬜ Başlamadı | |
| 4 — Tasarım sistemi | ⬜ Başlamadı | |
| 5 — Canlı veri | ⬜ Başlamadı | |
| 6 — Docker + deploy | ⬜ Başlamadı | |
| 7 — Test + portföy | ⬜ Başlamadı | |
