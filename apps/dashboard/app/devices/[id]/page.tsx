import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DeviceDetail } from "@/components/sections/DeviceDetail";
import { PredictionCard } from "@/components/sections/PredictionCard";
import { SimulationControls } from "@/components/sections/SimulationControls";
import { BentoCard } from "@/components/ui/BentoCard";
import { DeviceTypeIcon } from "@/components/ui/DeviceTypeIcon";
import { HealthRing } from "@/components/ui/HealthRing";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatEta } from "@/lib/format";
import { METRIC_LABEL, TYPE_LABEL } from "@/lib/labels";
import { CATALOG, MOCK_FAULTS, getMockDevice } from "@/lib/mock";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return CATALOG.map((d) => ({ id: d.device_id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: getMockDevice(id)?.name ?? "Cihaz bulunamadı" };
}

export default async function DevicePage({ params }: PageProps) {
  const { id } = await params;
  const device = getMockDevice(id);
  if (!device) notFound();

  return (
    <>
      <section className="mx-auto grid w-full max-w-content items-center gap-10 px-4 pb-4 pt-16 sm:px-6 md:grid-cols-[1fr_auto] md:pt-24">
        <div className="fade-up min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <DeviceTypeIcon type={device.type} />
            <p className="eyebrow">
              {TYPE_LABEL[device.type]} · {device.site}
            </p>
          </div>
          <h1 className="mt-4 text-balance text-hero">{device.name}</h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <StatusBadge status={device.status} className="px-3 py-1.5 text-[15px]" />
            {device.eta_minutes !== null && device.eta_metric ? (
              <p className="text-lead font-medium">
                {METRIC_LABEL[device.eta_metric]} {formatEta(device.eta_minutes)}
              </p>
            ) : (
              <p className="text-lead text-ink-secondary">Kritik eşiğe doğru bir eğilim yok.</p>
            )}
          </div>
        </div>
        <HealthRing
          value={device.health}
          size={200}
          stroke={14}
          label={`${device.name} sağlık skoru`}
          caption="Sağlık"
          className="fade-up mx-auto [animation-delay:120ms]"
        />
      </section>

      <DeviceDetail device={device} />

      <section aria-label="Kestirim ve simülasyon" className="mx-auto w-full max-w-content px-4 pb-24 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
          <PredictionCard device={device} />
          <BentoCard as="section" aria-labelledby="sim-title">
            <p className="eyebrow">Simülasyon</p>
            <h2 id="sim-title" className="mt-2 text-[24px] font-semibold leading-tight tracking-tight">
              Arızayı tetikle, tespiti izle.
            </h2>
            <p className="mb-5 mt-3 text-[15px] text-ink-secondary">
              Arızalar ani değil, zamanla büyüyen eğilimler olarak başlar.
            </p>
            <SimulationControls deviceName={device.name} initialFaults={MOCK_FAULTS[device.device_id] ?? []} />
          </BentoCard>
        </div>
      </section>
    </>
  );
}
