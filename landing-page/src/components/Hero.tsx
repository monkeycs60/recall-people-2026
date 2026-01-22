import Link from 'next/link';
import Image from 'next/image';
import PhoneMockup from './PhoneMockup';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-20 min-h-[90vh] flex items-center bg-surface">
      {/* Decorative blob shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Rose blob - top left */}
        <svg
          className="absolute -top-20 -left-20 w-80 h-80 md:w-[28rem] md:h-[28rem] opacity-60 animate-blob-float"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#FFB5C5"
            d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.5,90,-16.3,88.5,-0.9C87,14.5,81.4,29,73.1,42.2C64.8,55.4,53.8,67.3,40.4,74.6C27,81.9,11.2,84.6,-3.8,82.9C-18.8,81.2,-33,75.1,-45.8,67.1C-58.6,59.1,-70,49.2,-77.5,36.6C-85,24,-88.6,8.6,-86.8,-6.2C-85,-21,-77.8,-35.2,-67.9,-47.3C-58,-59.4,-45.4,-69.4,-31.7,-76.8C-18,-84.2,-3.2,-89,10.4,-87.4C24,-85.8,30.6,-83.6,44.7,-76.4Z"
            transform="translate(100 100)"
          />
        </svg>

        {/* Menthe blob - bottom right */}
        <svg
          className="absolute -bottom-32 -right-20 w-96 h-96 md:w-[32rem] md:h-[32rem] opacity-50 animate-blob-float-delayed"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#7DDEC3"
            d="M39.9,-65.7C54.3,-60.5,70.2,-54.7,78.5,-43.5C86.8,-32.3,87.5,-15.7,85.1,-0.5C82.7,14.7,77.2,28.5,68.7,40.2C60.2,51.9,48.7,61.5,35.9,68.5C23.1,75.5,9,79.9,-5.7,80.3C-20.4,80.7,-35.6,77.1,-48.5,69.9C-61.4,62.7,-72,52,-78.4,39C-84.8,26,-87,10.7,-85.5,-4.2C-84,-19.1,-78.8,-33.6,-69.8,-45.3C-60.8,-57,-48,-65.9,-34.4,-71.5C-20.8,-77.1,-6.4,-79.4,6.2,-78.1C18.8,-76.8,25.5,-70.9,39.9,-65.7Z"
            transform="translate(100 100)"
          />
        </svg>

        {/* Small rose blob - right side */}
        <svg
          className="absolute top-1/3 -right-10 w-48 h-48 md:w-64 md:h-64 opacity-40 animate-blob-float-slow"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#FFB5C5"
            d="M47.7,-79.1C62.3,-71.9,75.1,-60.5,82.8,-46.2C90.5,-31.9,93.1,-14.6,91.2,1.9C89.3,18.4,82.9,34.1,73.5,47.8C64.1,61.5,51.7,73.2,37.4,79.6C23.1,86,6.9,87.1,-9.3,85.1C-25.5,83.1,-41.7,78,-54.8,68.8C-67.9,59.6,-77.9,46.3,-83.4,31.4C-88.9,16.5,-89.9,0,-87.2,-15.8C-84.5,-31.6,-78.1,-46.7,-67.3,-57.9C-56.5,-69.1,-41.3,-76.4,-26,-80.4C-10.7,-84.4,4.7,-85.1,19.5,-82.5C34.3,-79.9,48.5,-73.9,47.7,-79.1Z"
            transform="translate(100 100)"
          />
        </svg>

        {/* Small menthe blob - left side */}
        <svg
          className="absolute bottom-1/4 -left-16 w-40 h-40 md:w-56 md:h-56 opacity-45 animate-blob-float-delayed"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#7DDEC3"
            d="M43.3,-74.4C56.1,-67.6,66.7,-56.4,74.1,-43.4C81.5,-30.4,85.7,-15.7,86.3,0.1C86.9,15.9,83.9,31.2,76.5,44.2C69.1,57.2,57.3,67.9,43.8,74.8C30.3,81.7,15.1,84.8,-0.5,85.6C-16.1,86.4,-32.2,84.9,-45.5,78.1C-58.8,71.3,-69.3,59.2,-76.4,45.4C-83.5,31.6,-87.2,16.1,-87.4,-0.1C-87.6,-16.3,-84.3,-33,-76.4,-47C-68.5,-61,-56,-72.3,-42,-79.1C-28,-85.9,-12.5,-88.2,1.4,-86.9C15.3,-85.6,30.5,-80.7,43.3,-74.4Z"
            transform="translate(100 100)"
          />
        </svg>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left: Text content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            {/* Badge with flat & bold style */}
            <div className="inline-flex items-center space-x-2 bg-rose/20 border-2 border-border rounded-full px-4 py-1.5 mb-6">
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
