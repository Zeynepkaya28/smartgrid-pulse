"use client";

import { HealthChart } from "@/components/charts/HealthChart";
import { BentoCard } from "@/components/ui/BentoCard";
import { useHealthHistory } from "@/hooks/useHistory";

export function HealthHistory({ deviceId }: { deviceId: string }) {
  const { data, isLoading, isError } = useHealthHistory(deviceId);
  return (
    <BentoCard span="wide" as="section" aria-labelledby="health-title">
      <p className="eyebrow">Sağlık geçmişi</p>
      <h2 id="health-title" className="mt-2 text-[24px] font-semibold leading-tight tracking-tight">
        Son 24 saat.
      </h2>
      <div className="mt-5">
        {data && data.length > 1 ? (
          <HealthChart data={data} />
        ) : (
          <p className="grid h-48 place-items-center text-[15px] text-ink-secondary">
            {isLoading ? "Yükleniyor…" : isError ? "Sağlık geçmişi alınamadı." : "Henüz sağlık kaydı yok."}
          </p>
        )}
      </div>
    </BentoCard>
  );
}
