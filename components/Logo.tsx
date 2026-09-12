import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";

export async function Logo({ compact = false }: { compact?: boolean }) {
  const locale = await getLocale();

  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={locale === "pt" ? "Vira Canção — início" : "Vira Canção — home"}>
      <span
        aria-hidden
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-wine-500 to-wine-700 text-white shadow-sm"
      >
        {/* Ondas sonoras em forma de coração */}
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M5 10v4M9 7v10M13 9v6M17 11v2" />
        </svg>
      </span>
      {!compact && (
        <span className="font-serif text-lg leading-none text-ink sm:text-xl">
          Vira<span className="text-wine-600">Canção</span>
        </span>
      )}
    </Link>
  );
}
