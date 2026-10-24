import { HealthRing } from "./HealthRing";

interface FleetHealthRingProps {
  value: number;
  deviceCount: number;
}

/** Large hero visual: average health across the fleet. Scales down on phones. */
export function FleetHealthRing({ value, deviceCount }: FleetHealthRingProps) {
  return (
    <div className="relative grid place-items-center" style={{ width: "min(80vw, 340px)" }}>
      <div aria-hidden="true" className="absolute inset-[-12%] rounded-full bg-accent/10 blur-3xl" />
      <HealthRing
        value={value}
        size={340}
        stroke={20}
        label={`Filo ortalama sağlık skoru, ${deviceCount} cihaz`}
        caption="Filo sağlığı"
        fluid
        className="relative w-full"
      />
    </div>
  );
}
