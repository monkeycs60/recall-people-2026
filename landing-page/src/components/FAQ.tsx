'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { faqs } from '@/data/faqs';

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
        <span className="flex items-baseline gap-2 sm:gap-4">
          <span className="text-sm text-text-muted font-mono">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="font-medium text-text-primary text-base sm:text-lg group-hover:text-primary transition-colors">
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
          <p className="pb-6 pl-0 sm:pl-10 pr-4 sm:pr-12 text-text-secondary leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="py-16 md:py-28 relative">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Questions & Answers
          </h2>
          <p className="text-lg text-text-secondary">
            Everything you need to know about Recall People.
          </p>
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
