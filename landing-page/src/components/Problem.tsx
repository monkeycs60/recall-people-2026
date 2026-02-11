'use client';

import { motion } from 'framer-motion';

export default function Problem() {
  return (
    <section className="py-20 md:py-32 px-6 max-w-4xl mx-auto text-center" aria-label="The Problem">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <span className="inline-block py-1 px-3 rounded-full bg-surface-alt border border-border text-xs font-semibold tracking-wider text-text-muted uppercase mb-12">
          Sound familiar?
        </span>
        
        <div className="space-y-12">
           <h2 className="text-3xl md:text-5xl text-text-secondary leading-tight font-light">
            You&apos;re at a dinner. You hit it off. <br className="hidden md:block"/>
            <span className="text-text-primary font-normal">Their kids&apos; names. The trip to Japan. That side project.</span>
          </h2>
          
          <div className="py-2">
            <span className="text-xl md:text-3xl text-text-muted italic font-serif">
              Two weeks later?
            </span>
          </div>
          
          <h2 className="text-3xl md:text-5xl text-text-muted leading-tight font-light blur-[1px] opacity-70">
             The kids&apos; names... where was it?
          </h2>
          
          <div className="pt-8">
            <p className="text-2xl md:text-4xl text-text-primary font-medium leading-relaxed">
              He remembers everything. <br/>
              <span className="text-error font-serif italic">You remember nothing.</span>
            </p>
          </div>

          <p className="text-lg text-text-secondary pt-8 max-w-2xl mx-auto">
             It&apos;s not your fault. You just need a better memory system.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
