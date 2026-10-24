import { HowItWorks } from "@/components/sections/HowItWorks";
import { RecentAlerts } from "@/components/sections/RecentAlerts";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { DeviceCard } from "@/components/ui/DeviceCard";
import { FleetHealthRing } from "@/components/ui/FleetHealthRing";
import { Hero } from "@/components/ui/Hero";
import { PillButton } from "@/components/ui/PillButton";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatStrip } from "@/components/ui/StatStrip";
import { formatBytes, formatCompact, formatNumber } from "@/lib/format";
import {
  MOCK_ALERTS,
  MOCK_DEVICES,
  MOCK_NOW,
  MOCK_STATS,
  fleetHealth,
  getMockSparkline,
} from "@/lib/mock";
import type { DeviceState } from "@/lib/types";

const SEVERITY_ORDER = { critical: 0, warning: 1, normal: 2 } as const;

function byUrgency(a: DeviceState, b: DeviceState): number {
  return SEVERITY_ORDER[a.status] - SEVERITY_ORDER[b.status] || a.health - b.health;
}

export default function HomePage() {
  const devices = [...MOCK_DEVICES].sort(byUrgency);
  const health = fleetHealth(MOCK_DEVICES);
  const attention = devices.filter((d) => d.status !== "normal").length;
  const stats = MOCK_STATS;

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
        subtitle={`${formatNumber(stats.device_count)} cihaz, saniyede bir ölçüm. ${
          attention > 0 ? `${attention} cihaz şu an dikkat istiyor.` : "Şu an her şey yolunda."
        }`}
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
        visual={<FleetHealthRing value={health} deviceCount={stats.device_count} />}
      />

      <section aria-label="Filo istatistikleri" className="mx-auto w-full max-w-content px-4 pb-8 sm:px-6">
        <StatStrip
          stats={[
            { label: "Cihaz", value: formatNumber(stats.device_count), hint: "4 saha" },
            {
              label: "Mesaj/sn",
              value: formatNumber(stats.messages_per_second, 0),
              hint: "MQTT telemetri",
            },
            {
              label: "Aktif alarm",
              value: formatNumber(stats.open_alerts),
              hint: "Onay bekliyor",
            },
            {
              label: "Veri boyutu",
              value: formatBytes(stats.telemetry_bytes),
              hint: `~${formatCompact(stats.telemetry_rows_estimate)} satır`,
            },
          ]}
        />
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
        <BentoGrid columns={4}>
          {devices.map((device, i) => (
            <DeviceCard
              key={device.device_id}
              device={device}
              sparkline={getMockSparkline(device.device_id)}
              span={i === 0 && device.status === "critical" ? "wide" : "single"}
            />
          ))}
        </BentoGrid>
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
          <RecentAlerts alerts={MOCK_ALERTS} now={MOCK_NOW} />
        </div>
      </section>

      <HowItWorks />
    </>
  );
}
