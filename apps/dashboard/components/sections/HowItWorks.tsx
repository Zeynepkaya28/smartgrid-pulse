import { BentoCard } from "@/components/ui/BentoCard";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { SectionHeading } from "@/components/ui/SectionHeading";

const STEPS = [
  {
    kicker: "MQTT",
    title: "Saniyede bir, her makineden.",
    body: "Sanal sensörler sıcaklık, titreşim, basınç ve akımı hafif MQTT mesajlarıyla yayınlar. Tarayıcı broker'a hiç bağlanmaz.",
  },
  {
    kicker: "Postgres bölümleme",
    title: "Milyonlarca satır, milisaniyeler.",
    body: "Ham veri günlük bölümlere yazılır, üç gün sonra kendiliğinden silinir. Uzun aralıklar dakikalık özetten okunur.",
  },
  {
    kicker: "Isolation Forest",
    title: "Her cihaz kendi normalini öğrenir.",
    body: "Kayan z-skor, cihaz başına Isolation Forest ve eğilim analizi birlikte çalışır; kritik eşiğe kalan süreyi tahmin eder.",
  },
  {
    kicker: "Realtime",
    title: "Panel, makineyle aynı anda.",
    body: "Filo durumu Supabase Realtime ile saniyede bir tarayıcıya akar. Arıza komutları sunucudan güvenle gönderilir.",
  },
] as const;

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="section">
      <SectionHeading
        id="how-title"
        eyebrow="Nasıl çalışır"
        title="Titreşim, arızadan önce konuşur."
        lead="Dört katman, tek bir amaç: sorunu makine durmadan önce görmek."
      />
      <BentoGrid columns={3}>
        {STEPS.map((step, i) => (
          <BentoCard key={step.kicker} span={i === 0 || i === 3 ? "wide" : "single"} as="article">
            <p className="text-[14px] font-semibold text-accent">{step.kicker}</p>
            <h3 className="mt-3 text-[24px] font-semibold leading-tight tracking-tight">{step.title}</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">{step.body}</p>
          </BentoCard>
        ))}
      </BentoGrid>
    </section>
  );
}
