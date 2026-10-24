import { DeviceGrid } from "@/components/sections/DeviceGrid";
import { FleetSubtitle, LiveFleetRing, LiveStatStrip } from "@/components/sections/HomeLive";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { RecentAlerts } from "@/components/sections/RecentAlerts";
import { Hero } from "@/components/ui/Hero";
import { PillButton } from "@/components/ui/PillButton";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getFleetStats } from "@/lib/data";

export default async function HomePage() {
  const stats = await getFleetStats();

  return (
    <>
      <Hero
        eyebrow="SmartGrid Pulse"
        title={
          <>
            Her makinenin nabzı.
            <br />
            Arızadan önce.
          </>
        }
        subtitle={<FleetSubtitle />}
        actions={
          <>
            <PillButton href="#cihazlar" size="lg">
              Cihazları incele
            </PillButton>
            <PillButton href="/simulator" variant="secondary">
              Arıza simüle et
            </PillButton>
          </>
        }
        visual={<LiveFleetRing />}
      />

      <section aria-label="Filo istatistikleri" className="mx-auto w-full max-w-content px-4 pb-8 sm:px-6">
        <LiveStatStrip stats={stats} />
      </section>

      <section aria-labelledby="cihazlar" className="section scroll-mt-12">
        <SectionHeading
          id="cihazlar"
          eyebrow="Cihazlar"
          title="Önce dikkat isteyenler."
          lead="Sağlık skoru; limitler, sapma, anomali skoru ve kritik eşiğe kalan süreden hesaplanır."
          action={
            <PillButton href="/devices" variant="secondary">
              Tüm cihazlar
            </PillButton>
          }
        />
        <DeviceGrid columns={4} highlightCritical />
      </section>

      <section aria-labelledby="alarmlar" className="bg-canvas-alt">
        <div className="section">
          <SectionHeading
            id="alarmlar"
            eyebrow="Alarmlar"
            title="Son uyarılar."
            action={
              <PillButton href="/alerts" variant="secondary">
                Tüm alarmlar
              </PillButton>
            }
          />
          <RecentAlerts />
        </div>
      </section>

      <HowItWorks />
    </>
  );
}
