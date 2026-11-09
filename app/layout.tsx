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
  title: "TDM GLUZ - Trương Duy Minh, Junior Business Analyst",
  description:
    "Portfolio cá nhân của Trương Duy Minh, định hướng Junior Business Analyst.",
  openGraph: {
    title: "TDM GLUZ - Trương Duy Minh, Junior Business Analyst",
    description:
      "Portfolio cá nhân của Trương Duy Minh, định hướng Junior Business Analyst.",
    locale: "vi_VN",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${headingFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
