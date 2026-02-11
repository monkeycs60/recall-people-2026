'use client';

import { motion } from 'framer-motion';

export default function VisualProof() {
  return (
    <section className="pt-48 pb-24 md:pt-72 overflow-hidden bg-gradient-to-b from-background to-surface-alt/30">
      <div className="container mx-auto px-4">
        
        {/* Integrated Story Lead-in */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
             <h2 className="text-3xl md:text-5xl font-semibold text-text-primary mb-6">
              Your social memory, <span className="text-primary italic">upgraded</span>.
             </h2>
             <p className="text-lg md:text-xl text-text-secondary leading-relaxed max-w-2xl mx-auto">
               Stop struggling to remember details from two weeks ago. <br className="hidden md:block" />
               Recall People gives you a second brain for your relationships.
             </p>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
