# Faz 2 — MQTT broker ve sanal IoT simülatörü

Arızalar ani sıçrama değil, zamanla büyüyen eğilimler olarak enjekte edilir; kestirimci
tahmin ancak böyle anlamlı olur.

## Prompt

```text
Faz 2: infra/mosquitto.conf ve services/simulator'ı yaz.

MOSQUITTO (lokal): listener 1883 (mqtt), persistence açık, allow_anonymous true sadece
lokal için; dosyaya üretimde password_file + TLS gerektiğini yorum olarak yaz.

SİMÜLATÖR (Python 3.12, asyncio, aiomqtt, pydantic-settings):
- Ayarlar env'den: MQTT_HOST, MQTT_PORT, MQTT_USERNAME, MQTT_PASSWORD, MQTT_TLS (bool),
  DEVICE_COUNT=12, PUBLISH_HZ=1. HiveMQ Cloud için TLS 8883 çalışmalı.
- 4 cihaz tipi profili (ambient °C, tam yükte sıcaklık artışı, nominal titreşim mm/s,
  basınç bar, nominal akım A, yük periyodu s):
  motor 24/38/1.6/3.2/48/180, wind_turbine 14/42/2.1/2.6/310/420,
  pump 22/30/1.9/6.4/36/240, transformer 26/34/0.6/0.35/520/600.
- Fizik: yük = 0.62 + 0.25·sin(2πt/periyot + faz) + gürültü, [0.1,1] aralığında.
  Sıcaklık birinci dereceden gecikmeyle (tau=45 s) hedefe yaklaşır; titreşim, basınç ve
  akım yükle ilişkili + Gauss gürültüsü.
- Arıza tipleri (şiddet 0.2–3.0), hepsi zamanla gelişir:
  overheat      -> +0.22·şiddet °C/s rampa ("Motoru Isıt")
  vibration     -> rulman aşınması: progress += 0.012·şiddet·(1+progress)·dt, üstel
                   büyüme + %4 olasılıkla darbe sıçraması ("Titreşimi Artır")
  pressure_leak -> basınç dakikada ~%36 düşer, en fazla %65 ("Basınç Kaçağı")
  current_surge -> akım dalgalanması + ek ısınma ("Akım Dalgalanması")
- Cihaz isimleri: "Motor MT-01", "Türbin WT-01", "Pompa PM-01", "Trafo TR-01";
  sahalar: Bursa Fabrika A, Aliağa Rüzgar Santrali, Kocaeli Fabrika B, İzmir Şebeke TM-3.
- Yayın: drift'siz zamanlayıcı (loop.time() tabanlı), CLAUDE.md topik sözleşmesi.
- Komutlar: smartgrid/cmd/+/fault ve smartgrid/cmd/all/reset'e abone ol, pydantic ile
  doğrula, geçersizi logla ve at. Her değişiklikte smartgrid/sim/faults (retained) yayınla.
- Bağlantı koparsa üstel bekleme (1s->30s) ile yeniden bağlan.
- /healthz HTTP uç noktası (Railway healthcheck için, aiohttp veya küçük FastAPI).
- Dockerfile: python:3.12-slim, non-root kullanıcı.
- Windows notu: aiomqtt Windows'ta ProactorEventLoop ile çalışmaz; lokal (Docker dışı)
  çalıştırmada WindowsSelectorEventLoopPolicy ayarla.

Test: pytest ile her arıza tipinin 120 simülasyon saniyesinde beklenen yönde değiştiğini
sahte saatle (time'ı enjekte ederek) doğrula. Lokalde mosquitto_sub -t 'smartgrid/#' -v
çıktısını göster.
```

## Bitti kontrol listesi

- [ ] `mosquitto_sub` saniyede 12 telemetri mesajı gösteriyor
- [ ] `mosquitto_pub` ile gönderilen inject komutu değerleri değiştiriyor
- [ ] HiveMQ Cloud'a TLS ile bağlanılabiliyor
