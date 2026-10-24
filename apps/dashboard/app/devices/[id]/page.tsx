import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DeviceDetail } from "@/components/sections/DeviceDetail";
import { DeviceHeader } from "@/components/sections/DeviceHeader";
import { HealthHistory } from "@/components/sections/HealthHistory";
import { PredictionCard } from "@/components/sections/PredictionCard";
import { SimulationControls } from "@/components/sections/SimulationControls";
import { BentoCard } from "@/components/ui/BentoCard";
import { createSupabaseServer } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getDeviceName(id: string): Promise<string | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("devices").select("name").eq("device_id", id).maybeSingle();
  return data?.name ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: (await getDeviceName(id)) ?? "Cihaz bulunamadı" };
}

export default async function DevicePage({ params }: PageProps) {
  const { id } = await params;
  const name = await getDeviceName(id);
  if (!name) notFound();

  return (
    <>
      <DeviceHeader deviceId={id} />
      <DeviceDetail deviceId={id} />
      <section aria-label="Kestirim ve simülasyon" className="mx-auto w-full max-w-content px-4 pb-24 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
          <PredictionCard deviceId={id} />
          <BentoCard as="section" aria-labelledby="sim-title" className="lg:row-span-2">
            <p className="eyebrow">Simülasyon</p>
            <h2 id="sim-title" className="mt-2 text-[24px] font-semibold leading-tight tracking-tight">
              Arızayı tetikle, tespiti izle.
            </h2>
            <p className="mb-5 mt-3 text-[15px] text-ink-secondary">
              Arızalar ani değil, zamanla büyüyen eğilimler olarak başlar.
            </p>
            <SimulationControls deviceId={id} deviceName={name} />
          </BentoCard>
          <HealthHistory deviceId={id} />
        </div>
      </section>
    </>
  );
}
