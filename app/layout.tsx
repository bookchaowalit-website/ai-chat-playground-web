import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat Playground — Compare AI models side by side",
  description: "Send one prompt to multiple AI models at once and compare their responses side by side, in a single unified interface.",
  keywords: ['AI chat playground', 'compare AI models', 'GPT vs Claude vs Gemini', 'Next.js', 'AI SDK'],
  authors: [{ name: 'Bookchaowalit', url: 'https://bookchaowalit.com' }],
  creator: 'Bookchaowalit',
  publisher: 'Bookchaowalit',
  metadataBase: new URL('https://chat-playground.bookchaowalit.com'),
  alternates: {
    canonical: 'https://chat-playground.bookchaowalit.com',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://chat-playground.bookchaowalit.com',
    title: 'Chat Playground — Compare AI models side by side',
    description: 'Send one prompt to multiple AI models at once and compare their responses side by side.',
    siteName: 'Chat Playground',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Chat Playground',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chat Playground — Compare AI models side by side',
    description: 'Send one prompt to multiple AI models at once and compare their responses side by side.',
    images: ['/og-image.png'],
    creator: '@bookchaowalit',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Analytics />
        <SpeedInsights />
        {children}
      </body>
    </html>
  );
}

// SEO TODO: Add Open Graph tags for social sharing
