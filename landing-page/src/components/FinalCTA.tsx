import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section id="download" className="py-24 md:py-32 bg-gradient-to-br from-primary/5 via-primary/10 to-primary-light/20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground font-serif mb-6">
            Stop forgetting.<br />
            <span className="text-primary">Start connecting.</span>
          </h2>

          <p className="text-xl text-text-secondary mb-10">
            Join thousands who never miss a detail again.
          </p>

          <Link
            href="#"
            className="group inline-flex items-center justify-center px-10 py-5 text-lg font-semibold text-white transition-all duration-200 bg-primary rounded-full hover:bg-primary-dark shadow-xl hover:shadow-2xl hover:-translate-y-1"
          >
            Download Recall
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>

          <div className="flex items-center justify-center gap-4 mt-8">
            <Link href="#" className="opacity-80 hover:opacity-100 transition-opacity">
              <img src="/images/app-store-badge.svg" alt="Download on the App Store" className="h-12" />
            </Link>
            <Link href="#" className="opacity-80 hover:opacity-100 transition-opacity">
              <img src="/images/google-play-badge.svg" alt="Get it on Google Play" className="h-12" />
            </Link>
          </div>

          <p className="text-sm text-text-muted mt-6">
            Free to start. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}
