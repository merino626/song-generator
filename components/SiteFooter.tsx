import Link from "next/link";
import { Logo } from "./Logo";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/dict";

export async function SiteFooter() {
  const d = getDict(await getLocale());

  return (
    <footer className="border-t border-wine-100 bg-white/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-ink/55">{d.footer.tagline}</p>
          </div>

          <div className="flex gap-12 text-sm">
            <div>
              <p className="font-semibold text-ink">{d.footer.produto}</p>
              <ul className="mt-3 space-y-2 text-ink/55">
                <li>
                  <Link href="/criar" className="hover:text-ink">
                    {d.footer.criarMusica}
                  </Link>
                </li>
                <li>
                  <Link href="/meus-pedidos" className="hover:text-ink">
                    {d.footer.meusPedidos}
                  </Link>
                </li>
                <li>
                  <a href="/#precos" className="hover:text-ink">
                    {d.footer.precos}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-ink">{d.footer.ajuda}</p>
              <ul className="mt-3 space-y-2 text-ink/55">
                <li>
                  <a href="/#faq" className="hover:text-ink">
                    {d.footer.faq}
                  </a>
                </li>
                <li>
                  <a href="/#exemplos" className="hover:text-ink">
                    {d.footer.exemplos}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-wine-100 pt-6 text-xs text-ink/45 sm:flex-row">
          <p>
            © {new Date().getFullYear()} Vira Canção · {d.footer.feito}
          </p>
          <p>{d.footer.selo}</p>
        </div>
      </div>
    </footer>
  );
}
