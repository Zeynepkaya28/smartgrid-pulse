import type { Metadata } from "next";

import { BentoGrid } from "@/components/ui/BentoGrid";
import { DeviceCard } from "@/components/ui/DeviceCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MOCK_DEVICES, getMockSparkline } from "@/lib/mock";

export const metadata: Metadata = { title: "Cihazlar" };

export default function DevicesPage() {
  const sites = [...new Set(MOCK_DEVICES.map((d) => d.site))];
  return (
    <div className="mx-auto w-full max-w-content px-4 pb-24 pt-16 sm:px-6 md:pt-20">
      <header className="mb-14">
        <p className="eyebrow">Cihazlar</p>
        <h1 className="mt-2 text-hero">Filo.</h1>
        <p className="mt-4 max-w-2xl text-lead text-ink-secondary">
          Dört sahada {MOCK_DEVICES.length} cihaz. Bir karta dokunarak telemetriyi ve kestirimi açın.
        </p>
      </header>
      {sites.map((site) => {
        const id = `saha-${site.toLocaleLowerCase("tr").replace(/[^a-z0-9ğüşıöç]+/g, "-")}`;
        return (
          <section key={site} aria-labelledby={id} className="mb-16 last:mb-0">
            <SectionHeading id={id} title={site} className="mb-6 [&_h2]:text-[28px] [&_h2]:sm:text-[32px]" />
            <BentoGrid columns={3}>
              {MOCK_DEVICES.filter((d) => d.site === site).map((device) => (
                <DeviceCard
                  key={device.device_id}
                  device={device}
                  sparkline={getMockSparkline(device.device_id)}
                />
              ))}
            </BentoGrid>
          </section>
        );
      })}
    </div>
  );
}
