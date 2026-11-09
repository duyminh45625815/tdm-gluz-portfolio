import type { Metadata } from "next";
import { Be_Vietnam_Pro, Bricolage_Grotesque } from "next/font/google";
import { translations } from "@/locales";
import { getRequestLocale } from "@/lib/locale";
import { LanguageProvider } from "./components/LanguageProvider";
import "./globals.css";

export const instant = false;

const headingFont = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["vietnamese", "latin"],
  weight: ["600", "800"],
});

const bodyFont = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = translations[locale].metadata;

  return {
    metadataBase: new URL("https://tdm-gluz.online"),
    title: content.title,
    description: content.description,
    openGraph: {
      title: content.title,
      description: content.description,
      url: "https://tdm-gluz.online",
      siteName: "TDM GLUZ",
      locale:
        locale === "ko"
          ? "ko_KR"
          : locale === "ja"
            ? "ja_JP"
            : locale === "vi"
              ? "vi_VN"
              : "en_US",
      type: "website",
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getRequestLocale();

  return (
    <html
      lang={locale}
      className={`${headingFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider initialLocale={locale}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
