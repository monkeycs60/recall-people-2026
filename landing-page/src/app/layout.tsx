import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { faqs } from "@/data/faqs";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Recall People - Never Forget Anyone You Meet",
  description: "The voice-first personal CRM. Record voice notes after conversations, automatically extract contacts, facts, and events. Your data stays on your device.",
  keywords: ["personal CRM", "voice notes", "contact management", "networking app", "remember names", "AI contacts"],
  authors: [{ name: "Recall People" }],
  creator: "Recall People",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://recall-people.com",
    siteName: "Recall People",
    title: "Recall People - Never Forget Anyone You Meet",
    description: "Record voice notes, automatically extract contacts. The privacy-first CRM that works offline.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Recall People - Voice-first Personal CRM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Recall People - Never Forget Anyone",
    description: "The voice-first personal CRM. Your data stays on your device.",
    images: ["/images/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://recall-people.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MobileApplication",
              "name": "Recall People",
              "description":
                "Recall People is a voice-first personal CRM. Record a quick voice note after any conversation — AI automatically extracts names, facts, and upcoming events into smart contact profiles. All data is stored locally on your device for complete privacy.",
              "applicationCategory": "ProductivityApplication",
              "operatingSystem": "iOS, Android",
              "offers": [
                {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD",
                  "description": "Free plan: 10 voice notes, 10 AI questions, 5 AI avatars per month",
                },
                {
                  "@type": "Offer",
                  "price": "3.99",
                  "priceCurrency": "USD",
                  "description": "Pro plan: unlimited voice notes, AI questions, and avatars",
                },
              ],
              "featureList": [
                "Voice-first capture in 5 languages",
                "AI extraction of names, facts, dates, and events",
                "Smart contact profiles with AI summaries",
                "Event reminders and upcoming events feed",
                "Semantic search across all contacts",
                "AI conversation starters",
                "Privacy-first local storage on device",
                "Offline access to all data",
                "Data export in JSON and CSV",
              ],
              "url": "https://recall-people.com",
              "downloadUrl": "https://apps.apple.com/app/recall-people-personal-crm/id6746268382",
              "inLanguage": ["en", "fr", "es", "it", "pt"],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": faqs.map((faq) => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": faq.answer,
                },
              })),
            }),
          }}
        />
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="16afad82-6cb1-469b-bca1-bbb3916ba913"
        />
      </head>
      <body className="antialiased font-sans bg-background text-foreground">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
