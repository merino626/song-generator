"use client";

import type { LucideIcon } from "lucide-react";

export function OptionCard({
  icon: Icon,
  label,
  description,
  active,
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  description?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`selectable ${active ? "selectable-active" : ""}`}
    >
      <div className="flex items-start gap-3">
        {Icon && <Icon className="h-5 w-5 shrink-0 text-wine-600" aria-hidden />}
        <div className="min-w-0">
          <p className="font-medium leading-tight text-ink">{label}</p>
          {description && <p className="mt-0.5 text-xs leading-snug text-ink/50">{description}</p>}
        </div>
      </div>
    </button>
  );
}

export function PillOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-wine-500 bg-wine-50 text-wine-700"
          : "border-wine-100 bg-white text-ink/70 hover:border-wine-300"
      }`}
    >
      {label}
    </button>
  );
}
