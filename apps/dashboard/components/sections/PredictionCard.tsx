"use client";

import { BentoCard } from "@/components/ui/BentoCard";
import { useDevice } from "@/hooks/useFleet";
import { formatNumber } from "@/lib/format";
import { METRIC_LABEL } from "@/lib/labels";

/** Predictive maintenance summary: time to critical, anomaly score, likely cause. */
export function PredictionCard({ deviceId }: { deviceId: string }) {
  const device = useDevice(deviceId);
  if (!device) return null;
  const eta = device.eta_minutes;
  const etaMetric = device.eta_metric;
  const headline =
    eta !== null && etaMetric
      ? eta <= 0
        ? `${METRIC_LABEL[etaMetric]} kritik eşiği aştı.`
        : `Bu hızla ${METRIC_LABEL[etaMetric].toLocaleLowerCase("tr")} ~${Math.max(1, Math.round(eta))} dk içinde kritik eşiğe ulaşır.`
      : "Kritik eğilim yok.";

  return (
    <BentoCard span="wide" as="section" aria-labelledby="prediction-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">Kestirim</p>
        {!device.model_ready ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent/10 px-2.5 py-1 text-[13px] font-semibold text-ink">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent motion-safe:animate-pulse" />
            Model öğreniyor
          </span>
        ) : null}
      </div>
      <h2
        id="prediction-title"
        aria-live="polite"
        className="mt-2 text-balance text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]"
      >
        {headline}
      </h2>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <div>
          <dt className="text-[13px] font-medium text-ink-secondary">Kalan süre</dt>
          <dd className="mt-1 text-[22px] font-semibold tabular-nums">
            {eta !== null ? `${formatNumber(eta, 1)} dk` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-ink-secondary">Anomali skoru</dt>
          <dd className="mt-1 text-[22px] font-semibold tabular-nums">
            {formatNumber(device.iforest * 100)}
            <span className="text-[15px] font-medium text-ink-secondary"> / 100</span>
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-ink-secondary">En büyük sapma</dt>
          <dd className="mt-1 text-[22px] font-semibold tabular-nums">z {formatNumber(device.max_abs_z, 1)}</dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-ink-secondary">Olası neden</dt>
          <dd className="mt-1 text-[22px] font-semibold">
            {device.cause_metric ? METRIC_LABEL[device.cause_metric] : "—"}
          </dd>
        </div>
      </dl>
      <p className="mt-6 text-[14px] text-ink-secondary">
        {device.model_ready
          ? "Isolation Forest modeli bu cihazın normal davranışıyla eğitildi."
          : "Model cihazın normal davranışını öğreniyor; anomali skoru henüz sağlık skoruna katılmıyor."}
      </p>
    </BentoCard>
  );
}
