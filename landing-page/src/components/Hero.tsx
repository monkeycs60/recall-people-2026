import Link from 'next/link';
import Image from 'next/image';
import PhoneMockup from './PhoneMockup';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-20 min-h-[90vh] flex items-center bg-background">
      {/* Decorative glow shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Large violet glow - top left */}
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full glow-violet opacity-30 animate-glow-breathe"
          style={{ animationDelay: '0s' }}
        />

        {/* Amber glow - bottom right */}
        <div
          className="absolute -bottom-40 -right-20 w-[400px] h-[400px] rounded-full glow-amber opacity-25 animate-glow-breathe"
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
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left: Text content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            {/* Badge with flat & bold style */}
            <div className="inline-flex items-center space-x-2 bg-primary-light/50 border-2 border-border rounded-full px-4 py-1.5 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-semibold text-text-primary">Voice-first. Privacy-first.</span>
            </div>

            <h1 className="text-[1.75rem] md:text-4xl lg:text-[3.25rem] font-bold tracking-tight text-text-primary leading-[1.1] mb-6">
              Small details make big differences.<br />
              <span className="text-primary">Recall every one.</span>
            </h1>

            <p className="text-base md:text-lg text-text-secondary max-w-lg mx-auto lg:mx-0 leading-relaxed mb-8">
              His kids&apos; names. Her dream trip to Japan. The side project he works on at night. Talk about anyone you meet — <span className="font-semibold text-text-primary">Recall People</span> organizes everything automatically.
            </p>

            {/* Store buttons with flat & bold style */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4 mb-6">
              <Link
                href="#"
                className="group transition-all duration-200 ease-out hover:-translate-y-0.5"
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
                className="group transition-all duration-200 ease-out hover:-translate-y-0.5"
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

            <p className="text-sm text-text-secondary">
              Free to start. Works offline. Your data never leaves your device.
            </p>
          </div>

          {/* Right: Phone mockup */}
          <div className="order-1 lg:order-2 flex justify-center">
            <PhoneMockup
              videoSrc="/video_app.webm"
              alt="Recall app demo video"
              className="transform lg:translate-x-4"
            />
          </div>
        </div>
      </div>

    </section>
  );
}
