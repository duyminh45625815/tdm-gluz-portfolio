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
  const title = "Truong Duy Minh | Personal Portfolio - IT Business Analyst";
  const image = {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: "Truong Duy Minh | Personal Portfolio - IT Business Analyst",
  };

  return {
    metadataBase: new URL("https://tdm-gluz.online"),
    title,
    description: content.description,
    openGraph: {
      title,
      description: content.description,
      url: "https://tdm-gluz.online",
      siteName: "TDM GLUZ",
      images: [image],
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
    twitter: {
      card: "summary_large_image",
      title,
      description: content.description,
      images: [image.url],
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
