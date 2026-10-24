import type { Metadata } from "next";

import { LoginForm } from "@/components/sections/LoginForm";

export const metadata: Metadata = { title: "Giriş" };

interface PageProps {
  searchParams: Promise<{ next?: string; hata?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { next, hata } = await searchParams;
  return (
    <div className="mx-auto grid min-h-[70vh] w-full max-w-content place-items-center px-4 py-20 sm:px-6">
      <div className="w-full max-w-md text-center">
        <p className="eyebrow">Giriş</p>
        <h1 className="mt-2 text-section">Kontrol sende.</h1>
        <p className="mx-auto mt-4 max-w-sm text-lead text-ink-secondary">
          Paneli herkes izleyebilir. Arıza simüle etmek ve alarmları onaylamak için e-postana gelen bağlantıyla giriş yap.
        </p>
        {hata ? (
          <p role="alert" className="mt-6 rounded-card bg-crit/10 px-4 py-3 text-[15px]">
            Bağlantının süresi dolmuş ya da geçersiz. Yeni bir bağlantı iste.
          </p>
        ) : null}
        <LoginForm next={next ?? "/"} />
      </div>
    </div>
  );
}
