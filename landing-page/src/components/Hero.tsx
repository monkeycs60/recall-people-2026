'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import PhoneMockup from './PhoneMockup';

export default function Hero() {
  return (
    <section className="relative min-h-screen pt-20 flex flex-col items-center text-center">
      
      {/* Main Content - Centered */}
      <div className="container mx-auto px-6 relative z-10 max-w-5xl flex-1 flex flex-col justify-center pt-32 md:pt-48">
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-text-primary leading-[1.1] mb-6"
          >
            You forget <span className="bg-primary/10 text-primary px-2 rounded-lg relative inline-block">80%</span> of every conversation.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed mb-10"
          >
            Become the person who never forgets a detail. <br className="hidden md:block" />
            <span className="opacity-80">The privacy-first personal CRM that turns your voice notes into real connections.</span>
          </motion.p>

          {/* Bottom section with buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col items-center"
          >
            {/* Store buttons */}
            <div className="flex flex-row items-center justify-center gap-4 mb-6">
              <Link
                href="#"
                className="group transition-all duration-200 ease-out hover:-translate-y-1"
                aria-label="Download on the App Store"
              >
                <Image
                  src="/images/app-store-badge.svg"
                  alt="Download on the App Store"
                  width={180}
                  height={54}
                  className="h-[54px] w-auto"
                />
              </Link>
              <Link
                href="#"
                className="group transition-all duration-200 ease-out hover:-translate-y-1"
                aria-label="Get it on Google Play"
              >
                <Image
                  src="/images/google-play-badge.svg"
                  alt="Get it on Google Play"
                  width={180}
                  height={54}
                  className="h-[54px] w-auto"
                />
              </Link>
            </div>

            <p className="text-sm text-text-muted max-w-md mx-auto">
              Privacy-first: AI processing with 100% local storage. <br className="hidden md:block"/>
              Your notes stay local unless you choose AI processing.
            </p>
          </motion.div>
      </div>

      {/* Phone Mockup Overlap */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="relative z-20 mt-20 -mb-24 md:-mb-40 w-full max-w-[85%] md:max-w-xl px-4"
      >
        <PhoneMockup 
          videoSrc="/app-tour.webm" 
          alt="Recall People App Interface"
          className="mx-auto"
        />
      </motion.div>

    </section>
  );
}
