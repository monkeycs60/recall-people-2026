import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Mic } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-50 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-light/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center space-x-2 bg-surface-hover border border-primary/20 rounded-full px-4 py-1.5 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-text-secondary">Talk first, organize later</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
            The CRM that <br />
            <span className="text-primary italic">truly listens.</span>
          </h1>

          <p className="text-xl text-text-secondary max-w-2xl leading-relaxed">
            Never lose an important detail again. Talk to Recall, and let AI organize everything for you.
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
              href="#how-it-works"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-foreground transition-all duration-200 bg-white border border-border rounded-full hover:bg-surface-hover hover:border-primary/30"
            >
              <Mic className="mr-2 h-5 w-5 text-primary" />
              Watch Demo
            </Link>
          </div>

          {/* App Preview */}
          <div className="mt-16 relative w-full max-w-sm mx-auto md:max-w-5xl">
             <div className="md:absolute md:left-1/2 md:-translate-x-1/2 md:w-[300px] z-20 transform transition-transform hover:scale-105 duration-500">
                <div className="relative rounded-[3rem] border-8 border-white shadow-2xl overflow-hidden bg-white">
                  <Image
                    src="/images/screenshots/contacts-list.png"
                    alt="Recall People App Interface"
                    width={1170}
                    height={2532}
                    className="w-full h-auto"
                    priority
                  />
                </div>
            </div>
            
            {/* Context Screenshots (Hidden on mobile, visible on desktop behind) */}
             <div className="hidden md:block absolute top-20 left-10 lg:left-32 w-[260px] opacity-60 -rotate-12 transform scale-90 blur-[1px]">
                <div className="rounded-[2.5rem] border-4 border-white/50 shadow-xl overflow-hidden">
                   <Image
                    src="/images/screenshots/profile.png"
                    alt="Recall Profile View"
                    width={1170}
                    height={2532}
                    className="w-full h-auto"
                  />
                </div>
             </div>
             
              <div className="hidden md:block absolute top-20 right-10 lg:right-32 w-[260px] opacity-60 rotate-12 transform scale-90 blur-[1px]">
                <div className="rounded-[2.5rem] border-4 border-white/50 shadow-xl overflow-hidden">
                   <Image
                    src="/images/screenshots/contact-id-1.png"
                    alt="Recall Contact View"
                    width={1170}
                    height={2532}
                    className="w-full h-auto"
                  />
                </div>
             </div>
          </div>
          
          <div className="h-[400px] w-full hidden md:block"></div> {/* Spacer for the absolute positioned images */}

        </div>
      </div>
    </section>
  );
}
