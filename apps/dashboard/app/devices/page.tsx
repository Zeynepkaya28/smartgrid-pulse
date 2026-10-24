import type { Metadata } from "next";

import { DevicesBySite } from "@/components/sections/DeviceGrid";

export const metadata: Metadata = { title: "Cihazlar" };

export default function DevicesPage() {
  return (
    <div className="mx-auto w-full max-w-content px-4 pb-24 pt-16 sm:px-6 md:pt-20">
      <header className="mb-14">
        <p className="eyebrow">Cihazlar</p>
        <h1 className="mt-2 text-hero">Filo.</h1>
        <p className="mt-4 max-w-2xl text-lead text-ink-secondary">
          Sahalara göre tüm cihazlar. Bir karta dokunarak canlı telemetriyi ve kestirimi açın.
        </p>
      </header>
      <DevicesBySite />
    </div>
  );
}
