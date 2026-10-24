# Faz 4 — Apple HIG tasarım sistemi ve dashboard iskeleti

Önce token'lar ve bileşenler, sonra sayfa iskeleti kurulur; veri bağlantısı Faz 5'e kalır.

## Prompt

```text
Bir Senior Frontend Developer ve UI/UX Designer olarak hareket et. apps/dashboard için
Apple'ın web sitesi (apple.com) ve macOS/iOS tasarım diliyle (Human Interface Guidelines)
uyumlu bir tasarım sistemi ve SmartGrid Pulse panelinin iskeletini kur. Next.js 15 App
Router + TypeScript + Tailwind CSS. Bu fazda veri SAHTE (lib/mock.ts), bağlantı Faz 5'te.

1. TİPOGRAFİ VE RENK (CSS değişkenleri + tailwind.config, açık/koyu tema
   prefers-color-scheme ile otomatik):
- Font: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter,
  sans-serif. Inter'i next/font/google ile yükle (Windows'ta SF Pro yok).
- Hiyerarşi: hero başlık clamp(48px, 8vw, 96px), font-weight 600-700,
  letter-spacing -0.015em; bölüm başlığı 40-56px; gövde 17-21px.
- Zemin #ffffff / #f5f5f7 (koyu: #000000 / #161617). Birincil metin #1d1d1f
  (koyu #f5f5f7), ikincil #86868b. Vurgu Apple Mavisi #0066cc (koyu #2997ff).
- Durum renkleri (Apple sistem renkleri): Normal #34c759, Uyarı #ffcc00 / #ff9f0a,
  Kritik #ff3b30. Renk asla tek başına anlam taşımasın: nokta + etiket birlikte.

2. BİLEŞENLER (components/ui, her biri ayrı dosya, prop'ları tipli):
- GlassNav: sticky, backdrop-filter blur(20px) saturate(180%),
  rgba(255,255,255,0.8) / rgba(22,22,23,0.8), 44-52px yükseklik, ince alt kenarlık.
  Linkler: Genel Bakış, Cihazlar, Alarmlar, Simülasyon. Mobilde sade açılır menü.
- Hero: üst etiket (eyebrow), dev başlık (ör. "Her makinenin nabzı. Arızadan önce."),
  gri alt başlık, iki buton. Görsel olarak büyük FleetHealthRing (filo ortalama sağlık
  skoru, SVG halka, yumuşak animasyon).
- PillButton: border-radius 980px. primary = mavi dolgu beyaz metin; secondary =
  şeffaf zemin, mavi metin + "›" simgesi.
- BentoGrid + BentoCard: border-radius 18-28px, 1px rgba(0,0,0,0.1) / rgba(255,255,255,0.1)
  kenarlık, hafif saydam cam yüzey; 1/2/3/4 kolon responsive, büyük kart (2x) desteği.
- DeviceCard: cihaz adı, tip ikonu, saha, StatusBadge, büyük health sayısı, sıcaklık
  sparkline'ı, ETA varsa "~6 dk içinde kritik" satırı.
- StatusBadge, HealthRing, MetricTile (değer + birim + z-skor), SegmentedControl
  (iOS tarzı, 15d / 1s / 6s / 24s / 7g), StatStrip (Cihaz, Mesaj/sn, Aktif alarm,
  Veri boyutu).

3. DÜZEN VE HİS:
- Bölümler arası 80-120px padding; içerik genişliği max 1200px, kenar boşluğu mobilde 16px.
- Minimalizm: kalabalık tablo, gereksiz çizgi, ağır gölge yok. Odak veride ve kısa,
  vurucu metinlerde ("Titreşim, arızadan önce konuşur.").
- Hareket: 200-400ms ease, prefers-reduced-motion'a uy.
- Erişilebilirlik: WCAG AA kontrast, odak halkaları, SVG'lerde aria-label.

4. SAYFALAR (iskelet, sahte veriyle):
- / : Hero + StatStrip + cihaz BentoGrid + son alarmlar + "Nasıl çalışır" 4'lü bento
  (MQTT, Postgres bölümleme, Isolation Forest, Realtime).
- /devices/[id] : cihaz hero'su (ad, durum, HealthRing), SegmentedControl, 4 metrik
  grafiği (Recharts, uyarı/kritik limit çizgileri), kestirim kartı, simülasyon butonları.
- /alerts : sade alarm listesi, önem filtresi, onayla butonu.
- /simulator : cihaz ızgarası, her kartta arıza pill butonları + "Tümünü sıfırla".

Kod temiz, modüler, responsive olsun. Sonunda 390px, 768px ve 1440px genişlikte
Playwright ekran görüntüsü al ve yatay taşma olmadığını doğrula.
```

## Bitti kontrol listesi

- [ ] Açık ve koyu temada tüm sayfalar sahte veriyle görünüyor
- [ ] 390px'te yatay kaydırma yok
- [ ] Lighthouse erişilebilirlik puanı ≥ 95
