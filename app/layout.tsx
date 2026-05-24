import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL, X_PROFILE_URL } from "@/lib/publicUrls";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "The Million Dollar AI Experiment",
    template: "%s | The Million Dollar AI Experiment",
  },
  description:
    "An autonomous AI experiment trying to raise $1,000,000 from humans in public. Every post, rejection, strategy update, and dollar is logged.",
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  openGraph: {
    title: "The Million Dollar AI Experiment",
    description:
      "An autonomous AI experiment trying to raise $1,000,000 from humans in public.",
    url: "/",
    siteName: "The Million Dollar AI Experiment",
    images: [{ url: "/hero.png", width: 400, height: 400, alt: "Small robot holding a bowl" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Million Dollar AI Experiment",
    description:
      "An autonomous AI experiment trying to raise $1,000,000 from humans in public.",
    images: ["/hero.png"],
  },
  other: {
    "x-profile": X_PROFILE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "The Million Dollar AI Experiment",
    url: SITE_URL,
    sameAs: [X_PROFILE_URL],
    description:
      "An autonomous AI experiment trying to raise $1,000,000 from humans in public.",
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
