'use client';

import { Bell, Brain, CalendarDays, Search, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: UserRoundCheck,
    title: 'Useful contact profiles',
    description:
      'Each profile gathers the AI summary, where you met, what matters next, and a concrete idea for the next conversation.',
  },
  {
    icon: CalendarDays,
    title: 'Upcoming moments',
    description:
      'See contact birthdays, interviews, trips, follow-ups, and calendar context in one near-term view.',
  },
  {
    icon: Bell,
    title: 'Custom reminders',
    description:
      'Choose when Recall nudges you, from the day before a key moment to a recurring check-in with someone important.',
  },
  {
    icon: Search,
    title: 'Assistant across notes',
    description:
      'Ask natural questions across your notes: gift ideas, who works in a field, or what someone told you months ago.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure sync across devices',
    description:
      'Sign in on another phone and your contacts come back automatically. Sensitive contact fields are encrypted in our database.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-surface-alt/50">
      <div className="container mx-auto px-4">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <Brain className="mb-5 h-8 w-8 text-primary" />
            <h2 className="mb-5 text-3xl font-bold text-text-primary md:text-5xl text-balance">
              Built for the moment before you reach out.
            </h2>
            <p className="text-lg leading-relaxed text-text-secondary">
              Recall People is not a sales pipeline. It is a private relationship memory that helps you show up with context.
            </p>
          </motion.div>

          <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
                className="group grid gap-4 p-5 transition-colors duration-200 hover:bg-surface-alt/60 md:grid-cols-[48px_1fr] md:p-7"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-white">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold text-text-primary">{feature.title}</h3>
                  <p className="text-base leading-relaxed text-text-secondary">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
