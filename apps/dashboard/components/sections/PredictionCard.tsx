import { BentoCard } from "@/components/ui/BentoCard";
import { formatEta, formatNumber } from "@/lib/format";
import { METRIC_LABEL } from "@/lib/labels";
import type { DeviceState } from "@/lib/types";

interface PredictionCardProps {
  device: DeviceState;
}

/** Predictive maintenance summary: time to critical, anomaly score, likely cause. */
export function PredictionCard({ device }: PredictionCardProps) {
  const eta = device.eta_minutes;
  return (
    <BentoCard span="wide" as="section" aria-labelledby="prediction-title">
      <p className="eyebrow">Kestirim</p>
      <h2 id="prediction-title" className="mt-2 text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
        {eta !== null && device.eta_metric
          ? `${METRIC_LABEL[device.eta_metric]} ${formatEta(eta)}.`
          : "Kritik eşiğe doğru bir eğilim yok."}
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
          <dd className="mt-1 text-[22px] font-semibold tabular-nums">
            z {formatNumber(device.max_abs_z, 1)}
          </dd>
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
          : "Model hâlâ normal davranışı öğreniyor; skorlar yalnızca bilgi amaçlı."}
      </p>
    </BentoCard>
  );
}
