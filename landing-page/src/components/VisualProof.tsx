'use client';

import { CalendarDays, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const upcoming = [
  { name: 'Sarah Chen', moment: 'Interview panel', when: 'Tomorrow', tone: 'bg-calendar-light/70' },
  { name: 'Nora Patel', moment: 'Paris visit', when: 'Friday', tone: 'bg-lavande' },
  { name: 'Mika Rossi', moment: 'Birthday', when: 'May 18', tone: 'bg-menthe' },
];

export default function VisualProof() {
  return (
    <section className="pt-48 pb-20 md:pt-72 md:pb-28 overflow-hidden bg-gradient-to-b from-background to-surface-alt/40">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="mb-5 text-3xl font-semibold text-text-primary md:text-5xl text-balance">
              A personal CRM that shows what to do next.
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-text-secondary md:text-xl">
              Open a profile, check what is coming up, ask across your notes, and keep your contacts synced securely.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mx-auto mt-14 grid max-w-6xl gap-4 lg:grid-cols-[1.2fr_0.8fr]"
        >
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-border bg-surface p-5 shadow-sm md:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-xl font-bold text-primary">
                    S
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-text-primary">Sarah Chen</h3>
                    <p className="text-sm text-text-secondary">Product lead, climate tools</p>
                  </div>
                </div>
                <p className="max-w-xl text-sm leading-relaxed text-text-secondary">
                  AI summary: Sarah is evaluating a move to Lyon, hiring her first research lead, and prefers specific follow-ups over open-ended check-ins.
                </p>
              </div>
              <Sparkles className="mt-2 h-5 w-5 shrink-0 text-primary" />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-surface-alt p-4">
                <p className="mb-2 text-xs font-semibold text-text-muted">Meeting context</p>
                <p className="text-sm leading-snug text-text-primary">Coffee after Product Salon. Discussed onboarding research and hiring.</p>
              </div>
              <div className="rounded-xl bg-calendar-light/70 p-4">
                <p className="mb-2 text-xs font-semibold text-text-secondary">Upcoming event</p>
                <p className="text-sm font-semibold text-text-primary">Interview panel on Friday</p>
                <p className="mt-1 text-xs text-text-secondary">Reminder: Thursday 9:00</p>
              </div>
              <div className="rounded-xl bg-primary-light p-4">
                <p className="mb-2 text-xs font-semibold text-primary">Conversation idea</p>
                <p className="text-sm leading-snug text-text-primary">Ask how the panel went and send the article you promised.</p>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4">
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-text-primary">Upcoming moments</h3>
              </div>
              <div className="space-y-2">
                {upcoming.map((item) => (
                  <div key={item.name} className="flex items-center gap-3 rounded-xl bg-surface-alt/70 p-3">
                    <div className={`h-9 w-1.5 rounded-full ${item.tone}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">{item.name}</p>
                      <p className="truncate text-xs text-text-secondary">{item.moment}</p>
                    </div>
                    <span className="text-xs font-semibold text-primary">{item.when}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-text-primary">Assistant search</h3>
              </div>
              <div className="rounded-xl bg-surface-alt p-3 text-sm text-text-primary">
                Who should I reconnect with before the conference?
              </div>
              <div className="mt-3 rounded-xl bg-primary/10 p-3 text-sm leading-snug text-text-primary">
                Nora will be in Paris Friday. Mika mentioned he can introduce you to two design leads.
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-primary/20 bg-primary text-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                <h3 className="text-lg font-bold">Secure sync</h3>
              </div>
              <p className="text-sm leading-relaxed text-white/90">
                Sign in on iOS or Android and your contacts are restored from encrypted server storage.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
