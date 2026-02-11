import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { faqs } from "@/data/faqs";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Recall People | The AI Personal CRM for Networking",
  description: "Stop forgetting the details that matter. Recall People is a voice-first personal CRM with 100% local storage. Build smart contact profiles using AI.",
  keywords: [
    "Personal CRM", "Networking App", "Remember names app", 
    "AI relationship manager", "Voice-to-CRM", "Private contact manager", 
    "Local storage CRM", "Relationship intelligence", "Social memory upgrade"
  ],
  authors: [{ name: "Recall People" }],
  creator: "Recall People",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://recall-people.com",
    siteName: "Recall People",
    title: "Recall People | The AI Personal CRM for Networking",
    description: "Your social memory, upgraded. Record voice notes, AI extracts the details. 100% private.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Recall People - AI Personal CRM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Recall People | The AI Personal CRM for Networking",
    description: "Stop forgetting details. Voice-first, 100% private personal CRM.",
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
    <html lang="en" className={inter.variable}>
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
