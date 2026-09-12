import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/dict";

export async function Faq() {
  const d = getDict(await getLocale());

  return (
    <div className="mx-auto max-w-3xl divide-y divide-wine-100 overflow-hidden rounded-3xl border border-wine-100 bg-white">
      {d.faqItens.map((item) => (
        <details key={item.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-ink">
            {item.q}
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 text-ink/40 transition group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-ink/65">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
