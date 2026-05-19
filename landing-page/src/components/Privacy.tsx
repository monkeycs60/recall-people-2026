'use client';

import { Cloud, Database, KeyRound, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const privacyPoints = [
  {
    icon: Database,
    title: 'Encrypted sensitive data',
    description: 'Notes, relationship context, and personal details are encrypted in our database.',
  },
  {
    icon: Cloud,
    title: 'Secure account sync',
    description: 'Your relationship data syncs through your account so it can follow you across devices.',
  },
  {
    icon: ShieldCheck,
    title: 'No AI training or sale',
    description: 'Your personal content is not used to train AI models, and we do not sell your data.',
  },
];

export default function Privacy() {
  return (
    <section id="privacy" className="py-24 bg-surface border-y border-border-light">
      <div className="container mx-auto px-4">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-6 text-3xl font-bold text-text-primary md:text-5xl text-balance">
              Private by design, synced when you need it.
            </h2>
            <p className="text-lg leading-relaxed text-text-secondary md:text-xl">
              Recall People syncs your relationship data through your account. Sensitive content is encrypted in our database, never sold, and never used to train AI models.
            </p>

            <div className="mt-8 space-y-3">
              {privacyPoints.map((point) => (
                <div key={point.title} className="grid grid-cols-[36px_1fr] gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-primary">
                    <point.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary">{point.title}</h3>
                    <p className="text-sm leading-relaxed text-text-secondary">{point.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            whileHover={{ y: -3 }}
            className="rounded-2xl border border-border bg-surface-alt p-5 shadow-sm md:p-7"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary">Secure sync</h3>
                  <p className="text-sm text-text-secondary">Account sync active</p>
                </div>
              </div>
              <span className="rounded-lg bg-menthe px-3 py-1 text-xs font-semibold text-text-primary">
                Ready
              </span>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl bg-surface p-4">
                <p className="text-sm font-semibold text-text-primary">1. Sign in to your account</p>
                <p className="mt-1 text-sm text-text-secondary">Your account keeps your relationship data available across devices.</p>
              </div>
              <div className="rounded-xl bg-surface p-4">
                <p className="text-sm font-semibold text-text-primary">2. Encrypt sensitive content</p>
                <p className="mt-1 text-sm text-text-secondary">Relationship notes and personal context are encrypted in the database.</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-4">
                <p className="text-sm font-semibold text-primary">3. Protect your memories</p>
                <p className="mt-1 text-sm text-text-secondary">Your data is not sold and is not used to train AI models.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
