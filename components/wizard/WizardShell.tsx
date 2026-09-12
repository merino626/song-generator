"use client";

import type { ReactNode } from "react";
import { useDict } from "@/components/LocaleProvider";
import { fmt } from "@/lib/i18n";

export function WizardShell({
  step,
  total,
  eyebrow,
  title,
  subtitle,
  children,
  onBack,
  footer,
}: {
  step: number;
  total: number;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  footer?: ReactNode;
}) {
  const d = useDict();
  const pct = Math.round(((step + 1) / total) * 100);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/45">
            {fmt(d.wizard.passo, { n: step + 1, total })} · {eyebrow}
          </p>
          {onBack && (
            <button type="button" onClick={onBack} className="text-xs text-ink/45 transition hover:text-ink">
              {d.wizard.voltar}
            </button>
          )}
        </div>
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-wine-100"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-wine-600 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div key={step} className="card animate-fade-up p-6 sm:p-9">
        <h1 className="font-serif text-2xl leading-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2.5 text-sm leading-relaxed text-ink/60">{subtitle}</p>}

        <div className="mt-7">{children}</div>

        {footer && <div className="mt-8">{footer}</div>}
      </div>
    </main>
  );
}
