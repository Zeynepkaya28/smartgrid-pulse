import type { Metadata } from "next";

import { SimulatorPanel } from "@/components/sections/SimulatorPanel";
import { MOCK_DEVICES, MOCK_FAULTS } from "@/lib/mock";

export const metadata: Metadata = { title: "Simülasyon" };

export default function SimulatorPage() {
  return (
    <div className="mx-auto w-full max-w-content px-4 pb-24 pt-16 sm:px-6 md:pt-20">
      <header className="mb-12">
        <p className="eyebrow">Simülasyon</p>
        <h1 className="mt-2 text-hero">Arızayı sen başlat.</h1>
        <p className="mt-4 max-w-2xl text-lead text-ink-secondary">
          Bir cihaz seç, arıza tipini aç ve motorun nasıl tepki verdiğini izle. Her arıza dakikalar içinde büyür; sistem onu eşiğe ulaşmadan yakalamaya çalışır.
        </p>
      </header>
      <SimulatorPanel devices={MOCK_DEVICES} initialFaults={MOCK_FAULTS} />
    </div>
  );
}
