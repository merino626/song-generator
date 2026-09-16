import Link from "next/link";
import { PLANS, formatBRL } from "@/lib/pricing";
import { getLocale } from "@/lib/i18n-server";
import { getDict, locPlan } from "@/lib/dict";

export async function PlanCards({ cta = true }: { cta?: boolean }) {
  const d = getDict(await getLocale());

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {PLANS.map((base) => {
          const plan = locPlan(d, base);
          const featured = plan.id === "priority";
          return (
            <div
              key={plan.id}
              className={`card relative overflow-hidden p-6 ${
                featured ? "border-wine-400 bg-gradient-to-br from-wine-50 to-white shadow-md" : ""
              }`}
            >
              {plan.highlight && (
                <span className="absolute right-5 top-5 rounded-full bg-wine-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                  {plan.highlight}
                </span>
              )}

              <div className="flex items-center gap-2">
                <plan.icon className="h-5 w-5 text-wine-600" aria-hidden />
                <h3 className="font-semibold text-ink">{plan.name}</h3>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-sm text-ink/40 line-through">{formatBRL(plan.anchorCents)}</span>
                <span className="text-3xl font-extrabold text-ink">{formatBRL(plan.priceCents)}</span>
              </div>
              <p className="mt-1 text-sm text-ink/60">{plan.deliveryLabel}</p>

              <ul className="mt-4 space-y-2">
                {plan.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-ink/75">
                    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-wine-500" fill="currentColor">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 10-1.4 1.4l2 2a1 1 0 001.4 0l4-4z" />
                    </svg>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-xs italic text-ink/45">{plan.footnote}</p>

              {cta && (
                <Link
                  href="/criar"
                  className={`mt-5 w-full ${featured ? "btn-primary animate-pulse-soft" : "btn-secondary"}`}
                >
                  {featured ? d.planCards.ctaPrioridade : d.planCards.ctaPadrao}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-ink/50">{d.planCards.selo}</p>
    </div>
  );
}
