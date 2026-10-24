# Faz 5 — Canlı veri, simülasyon paneli ve alarmlar

Sahte veri gerçek kaynaklarla değiştirilir: geçmiş Supabase RPC'lerinden, canlı durum
Realtime'dan gelir, arıza komutları sunucudan MQTT'ye gider.

## Prompt

```text
Faz 5: apps/dashboard'u gerçek veriye bağla. lib/mock.ts'i kaldır.

VERİ KATMANI:
- @supabase/ssr ile server ve browser client'ları. Tipleri "supabase gen types
  typescript" ile üret (types/database.ts).
- Server Components: device_latest, get_fleet_stats, son 20 alarm (ilk boyama sunucuda).
- hooks/useFleet.ts: Supabase Realtime kanalı "fleet", event "state" -> zustand store.
  Bağlantı durumu (canlı / yeniden bağlanıyor) navbar'da yeşil nokta olarak görünsün.
  Event "alert" gelince sağ üstte cam efektli toast göster.
- Cihaz detayı: SegmentedControl değişince get_device_history RPC (TanStack Query,
  30 sn refetch). "15d" seçiliyken her "state" event'inden gelen noktayı grafiğe ekle
  (son 900 nokta), grafik akıcı kaysın; Recharts animasyonunu canlı modda kapat.
- Kestirim kartı: eta_minutes varsa "Bu hızla {metrik} ~{n} dk içinde kritik eşiğe
  ulaşır", yoksa "Kritik eğilim yok". model_ready false ise "Model öğreniyor" rozeti.
- Sağlık geçmişi: device_health'ten 24 saatlik health_score çizgisi.

SİMÜLASYON KOMUTLARI:
- app/api/sim/route.ts (Node runtime): POST {device_id|"all", action, type?, intensity?},
  zod doğrulama, yalnızca giriş yapmış kullanıcı. mqtt.js ile HiveMQ'ye TLS bağlan,
  QoS1 publish, kapat (serverless'ta kalıcı bağlantı yok). Basit rate limit: kullanıcı
  başına dakikada 20 komut.
- Butonlar: "Motoru Isıt" (overheat), "Titreşimi Artır" (vibration), "Basınç Kaçağı"
  (pressure_leak), "Akım Dalgalanması" (current_surge), "Normale Döndür". Aktif arıza
  pill'i dolu görünsün; aktif arıza listesi Realtime state'ten veya ayrı bir "faults"
  event'inden gelsin (worker smartgrid/sim/faults'u dinleyip Realtime'a aktarır).
- Şiddet için iOS tarzı kaydırıcı (0.5x - 3x).

ALARMLAR VE YETKİ:
- Supabase Auth (e-posta magic link). Ziyaretçi paneli salt-okunur görür;
  simülasyon ve alarm onayı yalnızca girişli kullanıcıya açık.
- /alerts: önem filtresi (SegmentedControl), onayla -> acknowledged=true,
  acknowledged_by=auth.uid() (RLS bunu zorlar).

BİTTİ KRİTERİ: Lokalde simulator+worker+supabase çalışırken /devices/mt-01'de
"Motoru Isıt"a bas; kart 2-3 dk içinde yeşil -> sarı -> kırmızı olmalı, ETA azalarak
görünmeli, alarm toast'ı ve /alerts kaydı oluşmalı. "Normale Döndür" sonrası skor
yavaşça toparlanmalı.
```

## Bitti kontrol listesi

- [ ] Arıza senaryosu uçtan uca çalışıyor
- [ ] Service role key ve MQTT şifresi tarayıcı paketinde yok (`grep` ile kontrol)
- [ ] Girişsiz kullanıcı `/api/sim`'den 401 alıyor
