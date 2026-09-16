import Link from "next/link";
import { OCCASIONS } from "@/lib/occasions";
import { getLocale } from "@/lib/i18n-server";
import { getDict, locOccasion } from "@/lib/dict";

/**
 * Grid de ocasiões. É o nosso diferencial visível: o concorrente só faz
 * romântico — aqui a pessoa vê de cara que dá pra fazer zoação, formatura,
 * homenagem, etc. Cada card já entra no wizard com a ocasião escolhida.
 */
export async function OccasionGrid({ limit }: { limit?: number }) {
  const d = getDict(await getLocale());
  const items = (limit ? OCCASIONS.slice(0, limit) : OCCASIONS).map((o) => locOccasion(d, o));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((o) => (
        <Link
          key={o.slug}
          href={`/criar?ocasiao=${o.slug}`}
          className="group card flex flex-col gap-1.5 p-4 transition hover:-translate-y-0.5 hover:border-wine-300 hover:shadow-md"
        >
          <o.icon className="h-6 w-6 text-wine-600" aria-hidden />
          <span className="font-medium leading-tight text-ink">{o.label}</span>
          <span className="text-xs leading-snug text-ink/50">{o.tagline}</span>
          <span className="mt-1 text-xs font-medium text-wine-600 opacity-0 transition group-hover:opacity-100">
            {d.comecar}
          </span>
        </Link>
      ))}
    </div>
  );
}
