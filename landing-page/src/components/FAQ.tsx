'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

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

function FAQItem({
  question,
  answer,
  index,
}: {
  question: string;
  answer: string;
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border-light last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <span className="flex items-baseline gap-4">
          <span className="text-sm text-text-muted font-mono">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="font-medium text-text-primary text-lg group-hover:text-primary transition-colors">
            {question}
          </span>
        </span>

        <div
          className={`w-8 h-8 rounded-full border-2 border-border flex items-center justify-center flex-shrink-0 ml-4 transition-all duration-300 ${
            isOpen ? 'bg-primary border-primary rotate-45' : 'bg-transparent'
          }`}
        >
          <Plus
            className={`w-4 h-4 transition-colors duration-300 ${
              isOpen ? 'text-white' : 'text-text-primary'
            }`}
          />
        </div>
      </button>

      {/* Smooth animation using grid */}
      <div
        className="grid transition-all duration-300 ease-out"
        style={{
          gridTemplateRows: isOpen ? '1fr' : '0fr',
        }}
      >
        <div className="overflow-hidden">
          <p className="pb-6 pl-10 pr-12 text-text-secondary leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="max-w-3xl mx-auto mb-12">
          <p className="text-sm font-medium text-primary mb-3 tracking-wide">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
            Questions & Answers
          </h2>
        </div>

        {/* FAQ items */}
        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
