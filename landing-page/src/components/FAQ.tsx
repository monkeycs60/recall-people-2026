'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'Why Recall People?',
    answer:
      "Tired of forgetting your colleague's kids' names? Can't remember where your friend went on vacation? Recall People helps you never forget the little details that matter. Capture notes effortlessly, get notified about important events, and reconnect naturally with AI summaries and ice breakers.",
    emoji: '💡',
    accentColor: 'bg-primary-light',
  },
  {
    question: "What if I don't want to use my microphone?",
    answer:
      "No problem! You can type your notes manually, create contacts by hand, and add upcoming events yourself. Voice is just the fastest option — not the only one.",
    emoji: '⌨️',
    accentColor: 'bg-menthe',
  },
  {
    question: "What's included in the free plan?",
    answer:
      "You get 10 notes, 10 assistant questions, and 5 custom avatars for free. With a subscription, everything becomes unlimited — contacts, notes, and questions.",
    emoji: '🎁',
    accentColor: 'bg-calendar-light',
  },
  {
    question: 'What does the Assistant do?',
    answer:
      "The Assistant searches through all your notes using AI to find information about one or multiple contacts. Use it for gift ideas, making connections, or just remembering what someone told you months ago.",
    emoji: '✨',
    accentColor: 'bg-lavande',
  },
  {
    question: "Can I review what I've said about someone?",
    answer:
      "Yes! Every note — voice transcription or typed — is saved on each contact's profile. You can read and edit everything anytime, even after the fact. This is also what powers the Assistant: it searches through all your notes to give you accurate, personalized answers.",
    emoji: '📝',
    accentColor: 'bg-peche',
  },
  {
    question: 'Where is my data stored?',
    answer:
      "All your data stays on your phone — we don't store anything. Data is sent to our AI only when you record or ask a question, but nothing is kept. Be careful: if you delete the app, your data is gone. Cloud sync coming soon.",
    emoji: '🔒',
    accentColor: 'bg-bleu-ciel',
  },
  {
    question: 'Is my data used to train AI models?',
    answer:
      "No. Your notes are processed by our AI to generate summaries and answer questions, but they are never stored or used for training. Your memories stay yours.",
    emoji: '🛡️',
    accentColor: 'bg-rose',
  },
];

function FAQItem({
  question,
  answer,
  emoji,
  accentColor,
  index,
}: {
  question: string;
  answer: string;
  emoji: string;
  accentColor: string;
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Alternate slight offset for visual interest
  const offset = index % 2 === 0 ? 'md:translate-x-2' : 'md:-translate-x-2';

  return (
    <div
      className={`border-2 border-border rounded-2xl overflow-hidden bg-surface transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${offset}`}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-surface-alt/50 transition-colors"
      >
        {/* Emoji badge */}
        <div
          className={`w-10 h-10 rounded-xl ${accentColor} border-2 border-border flex items-center justify-center text-lg flex-shrink-0`}
        >
          {emoji}
        </div>

        <span className="font-semibold text-text-primary flex-1 pr-2">{question}</span>

        <ChevronDown
          className={`w-5 h-5 text-text-secondary flex-shrink-0 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="px-5 pb-5 pl-[4.5rem] text-text-secondary leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="py-20 md:py-28 bg-background relative overflow-hidden">
      {/* Subtle decorative elements */}
      <div className="absolute top-20 left-10 w-16 h-16 bg-primary-light/30 rounded-full blur-2xl" />
      <div className="absolute bottom-32 right-16 w-20 h-20 bg-calendar-light/40 rounded-full blur-2xl" />
      <div className="absolute top-1/2 right-8 text-4xl opacity-10 rotate-12">❓</div>

      <div className="container mx-auto px-4 relative">
        {/* Section header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface border-2 border-border rounded-full mb-6">
            <span className="text-lg">💬</span>
            <span className="text-sm font-medium text-text-secondary">Got questions?</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Everything you need to know about Recall People.
          </p>
        </div>

        {/* FAQ items with staggered layout */}
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              emoji={faq.emoji}
              accentColor={faq.accentColor}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
