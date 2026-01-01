import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24 min-h-[90vh] flex items-center">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-50 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-light/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center space-x-2 bg-surface-hover border border-primary/20 rounded-full px-4 py-1.5 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-text-secondary">Your social memory, upgraded</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
            You forget 80% of <br />
            <span className="text-primary italic">every conversation.</span>
          </h1>

          <p className="text-xl md:text-2xl text-text-secondary max-w-2xl leading-relaxed">
            Recall remembers everything. Just talk — AI organizes the rest.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Link
              href="#download"
              className="group inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white transition-all duration-200 bg-primary rounded-full hover:bg-primary-dark shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#scenario"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-foreground transition-all duration-200 bg-white border border-border rounded-full hover:bg-surface-hover hover:border-primary/30"
            >
              See how it works
              <ChevronDown className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="h-6 w-6 text-text-muted" />
      </div>
    </section>
  );
}
