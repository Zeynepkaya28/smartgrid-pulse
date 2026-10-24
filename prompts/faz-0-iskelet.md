# Faz 0 — Ana bağlam ve repo iskeleti

## Prompt

```text
Faz 0: CLAUDE.md'deki bağlamı oku ve monorepo iskeletini oluştur.

- Klasörler: apps/dashboard, services/simulator, services/worker, supabase, infra, docs.
- pnpm-workspace.yaml, kök package.json (script'ler: dev, lint, build, test),
  kök README taslağı, .gitignore (node, python, .env, .venv, supabase/.temp),
  .editorconfig, .gitattributes (LF satır sonu — Windows'ta shell script'leri bozulmasın).
- Her servis için boş Dockerfile ve .env.example.
- "supabase init" ile supabase/ klasörünü kur.
- CLAUDE.md'yi DEĞİŞTİRME; yalnızca eksik bilgi varsa bana sor.
- git init, ilk commit.

Sonunda klasör ağacını göster.
```

## Bitti kontrol listesi

- [ ] Klasör ağacı ve `pnpm-workspace.yaml` hazır
- [ ] `supabase init` çalıştı
- [ ] GitHub reposu açıldı, Vercel ve Supabase projeleri oluşturuldu
