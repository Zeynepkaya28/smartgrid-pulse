import type { Metadata } from "next";

import { AlertList } from "@/components/sections/AlertList";

export const metadata: Metadata = { title: "Alarmlar" };

export default function AlertsPage() {
  return (
    <div className="mx-auto w-full max-w-content px-4 pb-24 pt-16 sm:px-6 md:pt-20">
      <header className="mb-12">
        <p className="eyebrow">Alarmlar</p>
        <h1 className="mt-2 text-hero">Uyarılar.</h1>
        <p className="mt-4 max-w-2xl text-lead text-ink-secondary">
          Bir cihaz uyarıya ya da kritik duruma geçtiğinde burada anında görünür. Onayladığınızda listede kalır, ama sizi bir daha rahatsız etmez.
        </p>
      </header>
      <AlertList />
    </div>
  );
}
