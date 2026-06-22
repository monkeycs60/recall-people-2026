import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const APP_STORE_URL =
  "https://apps.apple.com/fr/app/recall-people/id6757320179";

export const metadata: Metadata = {
  metadataBase: new URL("https://recallpeople.com"),
  title: "Recall People: A personal CRM you talk to",
  description:
    "After a call or a coffee, just talk. In seconds, Recall People turns your voice into a structured profile and reminds you before it counts.",
  keywords: [
    "Personal CRM", "Networking App", "Remember names app",
    "AI relationship manager", "Voice-to-CRM", "Private contact manager",
    "Relationship intelligence", "Voice notes CRM", "Social memory upgrade",
  ],
  authors: [{ name: "Recall People" }],
  creator: "Recall People",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://recallpeople.com",
    siteName: "Recall People",
    title: "Recall People: A personal CRM you talk to",
    description:
      "Just talk after any conversation. In seconds, Recall People structures it into a profile, dates the upcoming moments, and reminds you before they happen.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Recall People: A personal CRM you talk to",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Recall People: A personal CRM you talk to",
    description:
      "Turn your voice into structured relationship memory in seconds, with reminders that actually fire.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://recallpeople.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MobileApplication",
              "name": "Recall People",
              "description":
                "Recall People is a voice-first personal CRM. Record a quick voice note after any conversation, and AI automatically extracts names, facts, and upcoming events into structured contact profiles, then reminds you before they happen. Data is local-first (SQLite) and synced through your account.",
              "applicationCategory": "ProductivityApplication",
              "operatingSystem": "iOS",
              "offers": [
                {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "EUR",
                  "description": "Free: up to 15 contacts, voice (up to 1 min) & text notes, event & reconnect reminders, unlimited icebreakers & summaries, 10 AI assistant questions per month",
                },
                {
                  "@type": "Offer",
                  "price": "4.99",
                  "priceCurrency": "EUR",
                  "description": "Premium monthly: unlimited contacts, weekly digest, unlimited AI assistant, 3-minute voice notes, post-event follow-up reminders",
                },
                {
                  "@type": "Offer",
                  "price": "39.99",
                  "priceCurrency": "EUR",
                  "description": "Premium annual: everything in Premium, two months free",
                },
              ],
              "featureList": [
                "Voice-first capture in 5 languages",
                "AI extraction of names, facts, dates, and events",
                "Hot topics auto-dated from speech, color-coded by urgency",
                "Per-contact timeline of past and upcoming moments",
                "AI-generated icebreakers before you meet",
                "Assistant that answers questions about your network with cited sources",
                "Full-text search across all notes",
                "Groups and flexible sorting",
                "Event reminders and push notifications",
                "Local-first storage (SQLite) with encrypted account sync",
              ],
              "url": "https://recallpeople.com",
              "downloadUrl": APP_STORE_URL,
              "inLanguage": ["en", "fr", "es", "it", "de"],
            }),
          }}
        />
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="16afad82-6cb1-469b-bca1-bbb3916ba913"
        />
      </head>
      <body className="antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
