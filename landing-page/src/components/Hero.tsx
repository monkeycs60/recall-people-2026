import Link from 'next/link';
import Image from 'next/image';
import PhoneMockup from './PhoneMockup';

export default function Hero() {
  return (
    <section className="relative pt-20 pb-8 md:pt-28 md:pb-20 md:min-h-screen flex items-center bg-background">
      {/* Decorative glow shapes - hidden on mobile for cleaner look */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        {/* Large violet glow - top left */}
        <div
          className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full glow-violet opacity-30 animate-glow-breathe -translate-x-1/4 -translate-y-1/4"
          style={{ animationDelay: '0s' }}
        />

        {/* Amber glow - bottom right */}
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full glow-amber opacity-25 animate-glow-breathe translate-x-1/4 translate-y-1/4"
          style={{ animationDelay: '2s' }}
        />

        {/* Small violet accent - right side near phone */}
        <div
          className="absolute top-1/3 right-[15%] w-[200px] h-[200px] rounded-full glow-violet-soft opacity-40 animate-glow-drift"
          style={{ animationDelay: '1s' }}
        />

        {/* Subtle amber accent - left side */}
        <div
          className="absolute bottom-1/3 left-[5%] w-[150px] h-[150px] rounded-full glow-amber-soft opacity-35 animate-glow-pulse"
        />

        {/* Very subtle violet orb - center top */}
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] h-[150px] rounded-full glow-violet-soft opacity-20 animate-glow-drift"
          style={{ animationDelay: '3s' }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 md:gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left: Text content */}
          <div className="text-center lg:text-left min-h-[70svh] md:min-h-0 flex flex-col items-center lg:items-start justify-evenly md:justify-start py-6 md:py-0">
            {/* Badge with flat & bold style */}
            <div className="inline-flex items-center space-x-2 bg-primary-light/50 border-2 border-border rounded-full px-4 py-1.5 md:mb-5">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-semibold text-text-primary">Voice-first. Privacy-first.</span>
            </div>

            <h1 className="text-[1.75rem] md:text-4xl lg:text-[3.25rem] font-bold tracking-tight text-text-primary leading-[1.15] md:mb-5">
              <span className="bg-primary-light px-1 -mx-1 rounded">Small details</span> make<br /><span className="bg-primary-light px-1 -mx-1 rounded">big differences</span>.<br />
              <span className="text-primary">Recall every one.</span>
            </h1>

            <p className="text-sm md:text-lg text-text-secondary max-w-lg mx-auto lg:mx-0 leading-relaxed md:mb-6">
              His kids&apos; names. Her dream trip to Japan. The side project he works on at night. Never forget what matters with <span className="font-semibold text-text-primary">Recall People</span>.
            </p>

            {/* Bottom section with buttons */}
            <div>
              {/* Store buttons - uniform size on mobile, bigger on desktop */}
              <div className="flex flex-row items-center justify-center lg:justify-start gap-3 lg:gap-4 mb-4">
                <Link
                  href="#"
                  className="group transition-all duration-200 ease-out hover:-translate-y-0.5 w-[152px] md:w-[160px] lg:w-[175px]"
                  aria-label="Download on the App Store"
                >
                  <Image
                    src="/images/app-store-badge.svg"
                    alt="Download on the App Store"
                    width={175}
                    height={52}
                    className="h-[44px] md:h-[48px] lg:h-[52px] w-full"
                  />
                </Link>
                <Link
                  href="#"
                  className="group transition-all duration-200 ease-out hover:-translate-y-0.5 w-[152px] md:w-[160px] lg:w-[175px]"
                  aria-label="Get it on Google Play"
                >
                  <Image
                    src="/images/google-play-badge.svg"
                    alt="Get it on Google Play"
                    width={175}
                    height={52}
                    className="h-[44px] md:h-[48px] lg:h-[52px] w-full"
                  />
                </Link>
              </div>

              <p className="text-xs md:text-sm text-text-secondary">
                Free to start. Works offline. Your data never leaves your device.
              </p>
            </div>
          </div>

          {/* Right: Phone mockup */}
          <div className="flex justify-center -mt-8 md:mt-0">
            <PhoneMockup
              videoSrc="/app-tour.webm"
              alt="Recall app demo video"
              className="transform lg:translate-x-4"
            />
          </div>
        </div>
      </div>

    </section>
  );
}
