"use client";

import { useEffect, useRef } from "react";

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "What is a personal CRM?",
    a: "A personal CRM is a private place to remember the people in your life: who they are, what matters to them, and what's coming up. Recall People is a voice-first personal CRM, so instead of filling in fields you just talk and it builds each profile for you.",
  },
  {
    q: "How can I remember details about the people I meet?",
    a: "Capture them while they're fresh. Right after a call, a coffee or an event, say what you remember and Recall People turns it into a structured profile: names, family, work, interests and dates. It then resurfaces the right details before you see that person again.",
  },
  {
    q: "How is Recall People different from a notes app or a spreadsheet?",
    a: "Notes and spreadsheets only store text, so you still have to organize it and remember to look. Recall People reads what you say, sorts every detail onto the right person automatically, and reminds you before each important moment, with no manual upkeep.",
  },
  {
    q: "Can I use Recall People for networking and client follow-ups?",
    a: "Yes. It's built for founders, freelancers and anyone who meets a lot of people. Log the context after each conversation and Recall People reminds you to follow up at the right time with a ready-made icebreaker, so you always pick up where you left off.",
  },
  {
    q: "Is my data private and secure?",
    a: "Yes. Your network is stored locally on your device first, then synced privately to your own account, so only you can ever see it. There is no social feed, no sharing, and your contacts are never sold or used for ads.",
  },
  {
    q: "Is Recall People free?",
    a: "Yes. The free plan covers up to 15 contacts with voice and text notes, timelines and reminders. Premium adds unlimited contacts and the AI assistant for €4.99 per month, or €39.99 per year.",
  },
];

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function Faq() {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const fqs = Array.from(root.querySelectorAll<HTMLElement>(".fq"));
    const handlers = fqs.map((fq) => {
      const handler = () => {
        const wasOpen = fq.classList.contains("open");
        fqs.forEach((o) => o.classList.remove("open"));
        if (!wasOpen) fq.classList.add("open");
      };
      const btn = fq.querySelector("button");
      btn?.addEventListener("click", handler);
      return handler;
    });
    return () => {
      fqs.forEach((fq, i) => {
        const btn = fq.querySelector("button");
        btn?.removeEventListener("click", handlers[i]);
      });
    };
  }, []);

  return (
    <section id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
      />
      <div className="wrap">
        <div className="sec-head">
          <p className="eyebrow" style={{ textAlign: "center" }}>
            FAQ
          </p>
          <h2>Good questions, answered.</h2>
        </div>
        <div className="faq" id="faqList" ref={listRef}>
          {FAQ_ITEMS.map((item) => (
            <div className="fq" key={item.q}>
              <button type="button">
                {item.q}
                <span className="plus" />
              </button>
              <div className="ans">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
