import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
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
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MobileApplication",
              "name": "Recall People",
              "description": "Voice-first personal CRM that extracts contacts from voice notes",
              "applicationCategory": "ProductivityApplication",
              "operatingSystem": "iOS, Android",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
              },
            }),
          }}
        />
      </head>
      <body className="antialiased font-sans bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
