# Faz 3 — Ingestion ve anomali motoru (worker)

Worker üç sinyali birleştirir: kapılı (gated) kayan z-skor, cihaz başına Isolation Forest ve
eğilimden "kritik eşiğe kalan süre". Kalibrasyon notları, bu simülatörle yapılan bir ön
denemede görülen yanlış alarmları (trafolarda sabit Isolation Forest eşiği) önlemek için eklendi.

## Prompt

```text
Faz 3: services/worker'ı yaz (Python 3.12, asyncio, aiomqtt, asyncpg, numpy, scikit-learn).

INGESTION:
- smartgrid/+/+/telemetry'ye abone ol; JSON'u pydantic ile doğrula, bozuksa at.
- Bellekte biriktir, her 1 s'de asyncpg copy_records_to_table ile toplu yaz.
- Supabase bağlantısı: Supavisor SESSION pooler (port 5432, IPv4) — COPY transaction
  pooler'da (6543) çalışmaz. DATABASE_URL env'den; bağlantı kopunca yeniden dene,
  bu sırada tamponu kaybetme (en fazla 60 sn'lik veri, sonra en eskiyi at ve logla).
- Yeni cihaz görünce devices tablosuna upsert, 30 sn'de bir last_seen güncelle.

TESPİT (cihaz başına DeviceMonitor sınıfı):
1) Kayan z-skor: metrik başına 600 örneklik pencere, O(1) toplam/kare toplam.
   Isınma 60 örnek. |z| > 4 olan örnekler taban çizgiye ÖĞRETİLMEZ (gelişen arıza
   kendini normal saymasın); 300 örnek üst üste reddedilirse yeni rejim kabul et.
   z için EMA (0.6/0.4) kullan, std tabanı = max(std, |ortalama|·0.002).
2) Isolation Forest: özellikler [sıcaklık, titreşim, basınç, akım], standardize et.
   Yalnızca "normal" örneklerle (|z|<3 ve limit içinde) eğit; ilk eğitim 180 örnekte,
   her 600 yeni normal örnekte yeniden eğit, tampon 1800. Eğitim run_in_executor ile
   thread'de; model+ortalama+std tek tuple olarak atomik değiştirilsin.
   ÖNEMLİ KALİBRASYON: anomali eşiğini sabit bir sayıyla verme. Eğitim verisinin
   -score_samples dağılımından p50 ve p99.5'i sakla; skor = clip((s - p99.5)/(p99.5 - p50), 0, 1).
   Aksi halde düşük varyanslı cihazlar (trafo) normal çalışırken alarm verir.
3) Eğilim / ETA: son 90 örneğe en küçük kareler eğimi + R². Yalnızca metrik zaten
   sapmışsa (|z_ema| >= 2.5 veya uyarı bölgesinde) VE R² >= 0.35 ise kritik limite
   kalan dakikayı hesapla (üst limitte pozitif, basınçta negatif eğim), 240 dk ile sınırla.
   Normal yük döngüsü sahte ETA üretmemeli.

LİMİTLER (uyarı/kritik): titreşim ISO 10816 4.5/7.1 mm/s (trafo 2.0/3.5);
motor 80/95 °C, türbin 75/90, pompa 70/85, trafo 85/105; basınç alt limit
nominalin %78/%60'ı; akım nominalin %115/%135'i. Config dosyasında tip bazlı tut.

SAĞLIK SKORU (0-100): 100 - (limit cezası [uyarıda 25-60, kritikte 60] + z cezası
min((maxz-3)·6, 30) + IF cezası 30·skor + ETA cezası min((15-eta)·1.5, 20)).
Asimetrik yumuşatma: düşüşte alpha 0.6, iyileşmede 0.08.
Durum: herhangi metrik kritikte veya skor<40 -> critical; uyarıda veya <70 -> warning.

TICK (1 Hz): tüm cihazları değerlendir;
- Supabase Realtime Broadcast REST API ile "fleet" kanalına event "state" gönder
  (service role key, httpx AsyncClient): her cihaz için değerler, z-skorlar, health,
  status, iforest, eta_minutes, eta_metric, cause_metric, model_ready, limitler.
- 5 sn'de bir device_health'e toplu INSERT.
- Durum yükselirse (normal->warning->critical) alerts'e Türkçe mesajla yaz, aynı cihaz+
  seviye için 60 sn cooldown, smartgrid/alerts'e ve Realtime "alert" event'ine yayınla.
  Örnek: "Sıcaklık kritik eşiği aştı: 97.2 °C (limit 95 °C) · Tahmini kritik eşik: ~4 dk"

TEST (pytest, zorunlu): simülatörün cihaz modelini sahte saatle içe aktaran bir senaryo
testi yaz: 12 cihaz, 900 sn normal + 420 sn arıza. Kabul: normal dönemde hiçbir cihaz
warning'e geçmez ve sahte ETA üretmez; overheat arızası 150 sn içinde warning, 200 sn
içinde critical olur ve critical'dan önce ETA verilir. Sonuç tablosunu yazdır.
```

## Bitti kontrol listesi

- [ ] Senaryo testi yeşil; normal dönemde yanlış alarm 0
- [ ] Supabase'de `telemetry` satır sayısı saniyede ~12 artıyor
- [ ] Realtime Inspector'da `fleet` kanalında saniyede bir `state` görülüyor
