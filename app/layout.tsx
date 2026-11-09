import type { Metadata } from "next";
import { Be_Vietnam_Pro, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://tdm-gluz.online"),
  title: "TDM GLUZ | Aspiring IT Business Analyst",
  description:
    "The portfolio of TDM GLUZ, an aspiring IT Business Analyst focused on requirements, process modeling, and technology-driven solutions.",
  openGraph: {
    title: "TDM GLUZ | Aspiring IT Business Analyst",
    description:
      "The portfolio of TDM GLUZ, an aspiring IT Business Analyst focused on requirements, process modeling, and technology-driven solutions.",
    url: "https://tdm-gluz.online",
    siteName: "TDM GLUZ",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
