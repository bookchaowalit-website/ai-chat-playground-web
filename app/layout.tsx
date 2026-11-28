import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SITE_URL, SOCIAL_CARD } from "@/lib/site";

// The font variable sits on <html>: the App shell tokens live on :root and read it from there.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const title = "Model Bench | Compare AI responses";
const description = "Send one prompt to configured AI models and read their responses side by side.";

export const metadata: Metadata = {
  title,
  description,
  authors: [{ name: "Bookchaowalit", url: "https://bookchaowalit.com" }],
  creator: "Bookchaowalit",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/", siteName: "Bookchaowalit", title, description, ...SOCIAL_CARD.openGraph },
  twitter: { creator: "@bookchaowalit", ...SOCIAL_CARD.twitter },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
