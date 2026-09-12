import Link from "next/link";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/dict";

export async function SiteHeader() {
  const d = getDict(await getLocale());

  return (
    <header className="sticky top-0 z-40 w-full border-b border-wine-100/70 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-7 md:flex">
          <a href="/#como-funciona" className="text-sm text-ink/60 transition hover:text-ink">
            {d.nav.comoFunciona}
          </a>
          <a href="/#ocasioes" className="text-sm text-ink/60 transition hover:text-ink">
            {d.nav.ocasioes}
          </a>
          <a href="/#exemplos" className="text-sm text-ink/60 transition hover:text-ink">
            {d.nav.exemplos}
          </a>
          <a href="/#precos" className="text-sm text-ink/60 transition hover:text-ink">
            {d.nav.precos}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/meus-pedidos" className="hidden text-sm text-ink/60 transition hover:text-ink lg:inline">
            {d.nav.meusPedidos}
          </Link>
          <Link href="/criar" className="btn-primary hidden !px-5 !py-2.5 sm:inline-flex">
            {d.nav.criar}
          </Link>
        </div>
      </div>
    </header>
  );
}
