import { PillButton } from "@/components/ui/PillButton";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-content place-items-center px-4 py-24 text-center">
      <div>
        <p className="eyebrow">404</p>
        <h1 className="mt-2 text-section">Bu sayfa bulunamadı.</h1>
        <p className="mt-4 text-lead text-ink-secondary">Aradığınız cihaz ya da sayfa artık burada değil.</p>
        <div className="mt-8">
          <PillButton href="/">Genel bakışa dön</PillButton>
        </div>
      </div>
    </div>
  );
}
