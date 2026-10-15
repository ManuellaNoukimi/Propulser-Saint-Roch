"use client";

import { useEffect, useState } from "react";
import { TOAST_EVENT } from "@/lib/toast";

export function Toaster() {
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      setMsg({ text: (e as CustomEvent<string>).detail, key: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 2400);
    };
    window.addEventListener(TOAST_EVENT, on);
    return () => {
      window.removeEventListener(TOAST_EVENT, on);
      clearTimeout(timer);
    };
  }, []);
  if (!msg) return null;
  return (
    <div
      key={msg.key}
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] left-1/2 z-[60] w-max max-w-[calc(100vw-32px)] -translate-x-1/2 animate-toast rounded-2xl border border-white/10 bg-[#262626] px-5 py-3.5 text-center text-sm leading-relaxed text-white shadow-xl md:bottom-8"
    >
      {msg.text}
    </div>
  );
}
