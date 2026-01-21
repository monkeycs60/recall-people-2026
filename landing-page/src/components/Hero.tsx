import Link from 'next/link';
import Image from 'next/image';
import PhoneMockup from './PhoneMockup';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-20 min-h-[90vh] flex items-center">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-50 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-light/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left: Text content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            <div className="inline-flex items-center space-x-2 bg-surface-hover border border-primary/20 rounded-full px-4 py-1.5 shadow-sm mb-6">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-text-secondary">Voice-first. Privacy-first.</span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
              Small details make big differences.<br />
              <span className="text-primary">Recall every one.</span>
            </h1>

            <p className="text-base md:text-lg text-text-secondary max-w-lg mx-auto lg:mx-0 leading-relaxed mb-8">
              His kids&apos; names. Her dream trip to Japan. The side project he works on at night. Talk about the people you meet — Recall People organizes everything automatically.
            </p>

            {/* Store buttons */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4 mb-6">
              <Link
                href="#"
                className="transition-transform hover:scale-105 hover:opacity-90"
                aria-label="Download on the App Store"
              >
                <Image
                  src="/images/app-store-badge.svg"
                  alt="Download on the App Store"
                  width={140}
                  height={47}
                  className="h-12 w-auto"
                />
              </Link>
              <Link
                href="#"
                className="transition-transform hover:scale-105 hover:opacity-90"
                aria-label="Get it on Google Play"
              >
                <Image
                  src="/images/google-play-badge.svg"
                  alt="Get it on Google Play"
                  width={158}
                  height={47}
                  className="h-12 w-auto"
                />
              </Link>
            </div>

            <p className="text-sm text-text-muted">
              Free to start. Works offline. Your data never leaves your device.
            </p>
          </div>

          {/* Right: Phone mockup */}
          <div className="order-1 lg:order-2 flex justify-center">
            <PhoneMockup
              src="/images/screenshots/contact-id-1.png"
              alt="Recall app showing contact profile"
              className="transform lg:translate-x-4"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
