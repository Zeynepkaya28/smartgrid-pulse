"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";

import { PillButton } from "@/components/ui/PillButton";
import { getBrowserSupabase } from "@/lib/supabase/client";

const EmailSchema = z.email();

type State = "idle" | "sending" | "sent" | "error";

/** Supabase Auth magic link (passwordless). */
export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = EmailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setState("error");
      setMessage("Geçerli bir e-posta adresi gir.");
      return;
    }
    setState("sending");
    const redirect = new URL("/auth/callback", window.location.origin);
    redirect.searchParams.set("next", next.startsWith("/") ? next : "/");
    const { error } = await getBrowserSupabase().auth.signInWithOtp({
      email: parsed.data,
      options: { emailRedirectTo: redirect.toString() },
    });
    if (error) {
      setState("error");
      setMessage(
        error.status === 429
          ? "Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene."
          : "Bağlantı gönderilemedi. Biraz sonra tekrar dene.",
      );
      return;
    }
    setState("sent");
    setMessage(`Giriş bağlantısı ${parsed.data} adresine gönderildi. E-postanı kontrol et.`);
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 text-left" noValidate>
      <label htmlFor="email" className="block text-[14px] font-medium text-ink-secondary">
        E-posta
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={state === "sending" || state === "sent"}
        className="mt-2 block h-12 w-full rounded-[14px] border border-hairline/15 bg-surface px-4 text-[17px] text-ink outline-none transition-shadow focus:border-accent focus:ring-4 focus:ring-accent/20 disabled:opacity-60"
        placeholder="ad@ornek.com"
      />
      <PillButton type="submit" size="lg" className="mt-5 w-full" disabled={state === "sending" || state === "sent"}>
        {state === "sending" ? "Gönderiliyor…" : "Giriş bağlantısı gönder"}
      </PillButton>
      <p aria-live="polite" className="mt-4 min-h-6 text-center text-[15px] text-ink-secondary">
        {message}
      </p>
    </form>
  );
}
