'use client';

import { Mic, UserSquare2, Sparkles, Bell } from 'lucide-react';

const features = [
  {
    icon: Mic,
    title: 'Capture in seconds',
    description: "Just met someone? Record a quick voice note. AI builds their profile with every detail — so next time, you remember everything.",
    className: 'md:col-span-2 bg-text-primary text-text-inverse', // Dark card for contrast
    iconClass: 'text-primary'
  },
  {
    icon: UserSquare2,
    title: 'Instant Smart Profiles',
    description: 'AI extracts names, personal details and upcoming life events into organized contact cards.',
    className: 'bg-surface border border-border',
    iconClass: 'text-primary'
  },
  {
    icon: Sparkles,
    title: 'Relationship Intelligence',
    description: "AI summaries of each person, icebreaker questions for your next meeting, and semantic search across all your contacts.",
    className: 'bg-surface border border-border',
    iconClass: 'text-primary'
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description: "Birthdays, job interviews, exams — get notified before the moments that matter. Nudges when you haven't reached out in a while. Plus a weekly digest to stay on top of all your relationships.",
    className: 'md:col-span-2 bg-surface-alt border border-border',
    iconClass: 'text-primary'
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-32 bg-surface-alt/50">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
            Everything you need to <span className="text-primary">remember</span>.
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
             Recall People turns casual conversations into lasting connections.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`p-8 md:p-10 rounded-3xl transition-transform duration-300 hover:scale-[1.01] ${feature.className}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-surface/10 flex items-center justify-center mb-6">
                 {/* 
                    If the card is dark (text-inverse), we might need a different icon background.
                    But for simplicity, let's keep it clean.
                 */}
                <feature.icon className={`w-8 h-8 ${feature.iconClass}`} />
              </div>
              <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
              <p className="text-lg opacity-80 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
