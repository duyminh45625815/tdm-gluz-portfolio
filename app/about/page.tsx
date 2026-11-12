import type { Metadata } from "next";
import AboutPage from "../components/AboutPage";
import { getRequestLocale } from "@/lib/locale";
import { translations } from "@/locales";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = translations[locale].aboutPage.metadata;
  const image = {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: content.title,
  };
  const openGraphLocale =
    locale === "ko"
      ? "ko_KR"
      : locale === "ja"
        ? "ja_JP"
        : locale === "vi"
          ? "vi_VN"
          : "en_US";

  return {
    title: content.title,
    description: content.description,
    openGraph: {
      title: content.title,
      description: content.description,
      url: "https://tdm-gluz.online/about",
      siteName: "TDM GLUZ",
      images: [image],
      locale: openGraphLocale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: content.title,
      description: content.description,
      images: [image.url],
    },
  };
}

export default function Page() {
  return <AboutPage />;
}
