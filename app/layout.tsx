import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const benchSans = Space_Grotesk({ variable: "--font-bench-sans", subsets: ["latin"] });
const benchMono = IBM_Plex_Mono({ variable: "--font-bench-mono", subsets: ["latin"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: "Model Bench — Compare AI responses",
  description: "Send one prompt to configured AI models and read their responses in parallel lanes.",
  metadataBase: new URL("https://chat-playground.bookchaowalit.com"),
  alternates: { canonical: "https://chat-playground.bookchaowalit.com" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={benchSans.variable + " " + benchMono.variable}><body><Analytics /><SpeedInsights />{children}</body></html>;
}
