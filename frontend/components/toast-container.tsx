"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/api";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type ToastItem = {
  id: string;
  message: string;
  type: "success" | "error" | "info";
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4000);
    });
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-3 ${
            t.type === "error"
              ? "border-red-500/40 bg-red-950 text-white"
              : "border-white/15 bg-ink text-white"
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm font-semibold">
            {t.type === "success" && (
              <CheckCircleIcon className="size-5 text-lime shrink-0" />
            )}
            {t.type === "error" && (
              <ExclamationCircleIcon className="size-5 text-red-400 shrink-0" />
            )}
            {t.type === "info" && (
              <InformationCircleIcon className="size-5 text-lime shrink-0" />
            )}
            <span>{t.message}</span>
          </div>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="text-white/60 hover:text-white"
          >
            <XMarkIcon className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

