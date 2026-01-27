import Link from 'next/link';
import Image from 'next/image';
import PhoneMockup from './PhoneMockup';

export default function Hero() {
  return (
    <section className="relative pt-20 pb-8 md:pt-28 md:pb-20 md:min-h-screen flex items-center">
      {/* Glows handled by ScrollGlows component with Framer Motion */}

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 md:gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left: Text content - more vertical spacing */}
          <div className="text-center lg:text-left min-h-[65svh] md:min-h-0 flex flex-col items-center lg:items-start justify-evenly md:justify-start py-4 md:py-0 gap-2 md:gap-0">
            {/* Badge - subtle style */}
            <div className="inline-flex items-center space-x-2 bg-primary-light/30 border border-border-light rounded-full px-4 py-1.5 mb-3 md:mb-10">
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary/60" />
              <span className="text-sm font-medium text-text-secondary">Your Personal CRM</span>
            </div>

            <h1 className="text-[2rem] md:text-4xl lg:text-[3.25rem] font-bold tracking-tight text-text-primary leading-[1.15] mb-4 md:mb-8">
              <span className="bg-primary/25 px-1 -mx-1 rounded">Small details</span> make<br /><span className="bg-primary/25 px-1 -mx-1 rounded">big differences</span>.
            </h1>

            <p className="text-base md:text-lg text-text-secondary max-w-lg mx-auto lg:mx-0 leading-relaxed mb-5 md:mb-10">
              His kids&apos; names. Her dream trip to Japan. The side project he works on at night. Never forget what matters with <span className="font-semibold text-text-primary">Recall People</span>.
            </p>

            {/* Bottom section with buttons */}
            <div>
              {/* Store buttons - bigger on mobile */}
              <div className="flex flex-row items-center justify-center lg:justify-start gap-3 lg:gap-4 mb-4">
                <Link
                  href="#"
                  className="group transition-all duration-200 ease-out hover:-translate-y-0.5 w-[160px] md:w-[165px] lg:w-[175px]"
                  aria-label="Download on the App Store"
                >
                  <Image
                    src="/images/app-store-badge.svg"
                    alt="Download on the App Store"
                    width={175}
                    height={52}
                    className="h-[48px] md:h-[50px] lg:h-[52px] w-full"
                  />
                </Link>
                <Link
                  href="#"
                  className="group transition-all duration-200 ease-out hover:-translate-y-0.5 w-[160px] md:w-[165px] lg:w-[175px]"
                  aria-label="Get it on Google Play"
                >
                  <Image
                    src="/images/google-play-badge.svg"
                    alt="Get it on Google Play"
                    width={175}
                    height={52}
                    className="h-[48px] md:h-[50px] lg:h-[52px] w-full"
                  />
                </Link>
              </div>

              <p className="hidden md:block text-sm text-text-secondary">
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
