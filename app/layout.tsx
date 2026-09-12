import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/dict";
import { LocaleProvider } from "@/components/LocaleProvider";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Metadata segue o idioma do cookie — ler cookie torna o site dinâmico
// (sem pré-render estático), o que aceitamos em troca do bilíngue sem
// mudar nenhuma URL. Ver lib/i18n.ts para o porquê dessa arquitetura.
export async function generateMetadata(): Promise<Metadata> {
  const d = getDict(await getLocale());
  return { title: d.meta.title, description: d.meta.description };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale === "pt" ? "pt-BR" : "en"} className={`${display.variable} ${body.variable}`}>
      <body className="font-sans">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
