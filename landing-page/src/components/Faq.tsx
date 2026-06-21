"use client";

import { useEffect, useRef } from "react";

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Do I have to fill in forms or fields?",
    a: "Never. You just talk — or type a few lines. Recall People transcribes it, finds the right person, and structures the details, dates and interests for you.",
  },
  {
    q: "Where is my data stored?",
    a: "Locally on your device first, then synced privately to your account so it's there on every login. It's your network — only you can see it.",
  },
  {
    q: "How do the reminders work?",
    a: "Recall People reads dates straight from what you say — “his demo's next Tuesday” becomes a real, color-coded event — and sends a push before each moment so nothing slips.",
  },
  {
    q: "Which languages are supported?",
    a: "The interface and voice transcription both work in English, French, Spanish, Italian and German.",
  },
  {
    q: "How long can a voice note be?",
    a: "Up to three minutes per note — plenty to capture everything from a long catch-up. You can also switch to typing anytime.",
  },
  {
    q: "Is there an Android version?",
    a: "Recall People is live on iPhone today. Android is coming soon — and the same account will carry over.",
  },
];

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
