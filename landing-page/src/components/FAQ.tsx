'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'Why Recall People?',
    answer:
      "Tired of forgetting your colleague's kids' names? Can't remember where your friend went on vacation? Recall People helps you never forget the little details that matter. Capture notes effortlessly, get notified about important events, and reconnect naturally with AI summaries and ice breakers.",
  },
  {
    question: "What if I don't want to use my microphone?",
    answer:
      "No problem! You can type your notes manually, create contacts by hand, and add upcoming events yourself. Voice is just the fastest option — not the only one.",
  },
  {
    question: "What's included in the free plan?",
    answer:
      "You get 10 notes, 10 assistant questions, and 5 custom avatars for free. With a subscription, everything becomes unlimited — contacts, notes, and questions.",
  },
  {
    question: 'What does the Assistant do?',
    answer:
      "The Assistant searches through all your notes using AI to find information about one or multiple contacts. Use it for gift ideas, making connections, or just remembering what someone told you months ago.",
  },
  {
    question: "Can I review what I've said about someone?",
    answer:
      "Yes! Every note — voice transcription or typed — is saved on each contact's profile. You can read and edit everything anytime, even after the fact. This is also what powers the Assistant: it searches through all your notes to give you accurate, personalized answers.",
  },
  {
    question: 'Where is my data stored?',
    answer:
      "All your data stays on your phone — we don't store anything. Data is sent to our AI only when you record or ask a question, but nothing is kept. Be careful: if you delete the app, your data is gone. Cloud sync coming soon.",
  },
  {
    question: 'Is my data used to train AI models?',
    answer:
      "No. Your notes are processed by our AI to generate summaries and answer questions, but they are never stored or used for training. Your memories stay yours.",
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-2 border-border rounded-2xl overflow-hidden bg-surface">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-surface-alt transition-colors"
      >
        <span className="font-semibold text-text-primary pr-4">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-text-secondary flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <p className="px-6 pb-5 text-text-secondary leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="py-20 md:py-28 bg-surface-alt">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Everything you need to know about Recall People.
          </p>
        </div>

        {/* FAQ items */}
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}
