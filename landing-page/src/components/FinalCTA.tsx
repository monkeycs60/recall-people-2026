import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section id="download" className="relative py-24 md:py-32 bg-primary overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute top-8 left-8 w-16 h-16 bg-rose/40 rounded-full" />
      <div className="absolute top-1/4 right-12 w-12 h-12 bg-menthe/40 rounded-full" />
      <div className="absolute bottom-12 left-1/4 w-10 h-10 bg-peche/50 rounded-full" />
      <div className="absolute bottom-1/3 right-1/4 w-8 h-8 bg-bleu-ciel/40 rounded-full" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Stop forgetting.<br />
            Start connecting.
          </h2>

          <p className="text-lg md:text-xl text-white/90 mb-10">
            Join thousands who never miss a detail again.
          </p>

          <Link
            href="#"
            className="group inline-flex items-center justify-center px-10 py-5 text-lg font-semibold text-text-primary bg-white border-2 border-border rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
          >
            Download Recall
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>

          <div className="flex items-center justify-center gap-4 mt-8">
            <Link href="#" className="opacity-90 hover:opacity-100 hover:-translate-y-0.5 transition-all duration-200">
              <img src="/images/app-store-badge.svg" alt="Download on the App Store" className="h-12" />
            </Link>
            <Link href="#" className="opacity-90 hover:opacity-100 hover:-translate-y-0.5 transition-all duration-200">
              <img src="/images/google-play-badge.svg" alt="Get it on Google Play" className="h-12" />
            </Link>
          </div>

          <p className="text-sm text-white/80 mt-6">
            Free to start. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}
