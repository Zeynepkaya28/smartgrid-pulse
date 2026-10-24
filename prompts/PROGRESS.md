# İlerleme

Claude Code her fazın sonunda bu dosyayı günceller.

| Faz | Durum | Not |
|---|---|---|
| 0 — İskelet | ✅ Tamamlandı | Monorepo iskeleti, `supabase init`, GitHub repo (public), Supabase projesi (eu-central-1, PG17, linked), Vercel projesi (root: apps/dashboard, GitHub'a bağlı) |
| 1 — Supabase şeması | ✅ Tamamlandı | 6 migration + seed (12 cihaz). `db reset` hatasız; 15m sorgusu yalnızca bugünün bölümünü tarıyor (Subplans Removed), 24h yalnızca telemetry_1m; 3 cron işi `cron.job`'da; anon INSERT 401/42501. Uzak projeye `db push` + seed yapıldı; cron, RLS ve anon erişimi uzakta da doğrulandı |
| 2 — MQTT + simülatör | ✅ Tamamlandı | Mosquitto + simülatör: 12 mesaj/s, inject/clear/reset, retained arıza haritası, yeniden bağlanma, /healthz, Docker (non-root); 36 test, ruff + mypy strict. TLS test.mosquitto.org:8886 üzerinde doğrulandı (12 mesaj/s + uzaktan inject). HiveMQ ücretsiz planı kalktığı için üretim broker'ı kullanıcıya bırakıldı (kullanıcı kararı) |
| 3 — Worker + anomali | ✅ Tamamlandı | Senaryo testi 3 seed'de yeşil: normal dönemde yanlış alarm 0, sahte ETA 0; motor overheat warning 64–75 s, critical 130–171 s, ETA önce. Uzak Supabase'de telemetry ~12 satır/s, Realtime `fleet` ~1 state/s (anon abone ile doğrulandı). Prompta ek: pencere dolunca |z_ema|≥2.5 iken öğrenme durdurulur; ETA 600 örneklik olgun taban ister; IF cezası model ≥600 örnekle eğitilince devreye girer |
| 4 — Tasarım sistemi | ✅ Tamamlandı | Next.js 15 + Tailwind token'ları, 13 UI bileşeni, 5 sayfa (sahte veri). Playwright: 5 sayfa × 390/768/1440 px × açık/koyu, yatay taşma ve konsol hatası yok; axe WCAG 2.1 AA ihlali yok; Lighthouse erişilebilirlik 100 (tüm sayfalar, iki tema). Açık temada ikincil metin #6e6e73 (kontrast için) |
| 5 — Canlı veri | ⬜ Başlamadı | |
| 6 — Docker + deploy | ⬜ Başlamadı | |
| 7 — Test + portföy | ⬜ Başlamadı | |
