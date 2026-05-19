import Image from 'next/image';

interface PhoneMockupProps {
  src?: string;
  videoSrc?: string;
  alt: string;
  className?: string;
}

export default function PhoneMockup({ src, videoSrc, alt, className = '' }: PhoneMockupProps) {
  return (
    <div className={`relative ${className}`}>
      {/* iPhone frame - responsive width, slightly smaller on desktop */}
      <div className="relative mx-auto w-[240px] sm:w-[280px] lg:w-[260px]">
        {/* Phone body */}
        <div className="relative bg-[#1a1a1a] rounded-[3rem] p-2 shadow-2xl">
          {/* Screen bezel */}
          <div className="relative rounded-[2.5rem] overflow-hidden">
            {/* Screen content */}
            <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.5rem]">
              {videoSrc ? (
                <video
                  src={videoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover object-top"
                  aria-label={alt}
                />
              ) : src ? (
                <Image
                  src={src}
                  alt={alt}
                  fill
                  className="object-cover object-top"
                  priority
                />
              ) : (
                <div
                  className="absolute inset-0 bg-[#fbfaf8] px-4 py-5 text-left text-text-primary"
                  role="img"
                  aria-label={alt}
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold">Recall</span>
                    <span className="rounded-md bg-primary-light px-2 py-1 text-[10px] font-medium text-primary">
                      Prepared
                    </span>
                  </div>

                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lavande text-lg font-bold text-primary">
                      S
                    </div>
                    <div>
                      <p className="text-lg font-bold leading-tight">Sarah Chen</p>
                      <p className="text-[11px] text-text-secondary">Met at Product Salon</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl border border-border bg-white p-3">
                      <p className="mb-1 text-[10px] font-semibold text-text-muted">AI summary</p>
                      <p className="text-[12px] leading-snug">
                        Product lead exploring climate tools. Mentioned she is moving to Lyon and likes practical follow-ups.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-surface-alt p-3">
                      <p className="mb-1 text-[10px] font-semibold text-text-muted">Meeting context</p>
                      <p className="text-[12px] leading-snug">
                        Coffee after the meetup. You discussed onboarding research and her hiring plan.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-calendar-light bg-calendar-light/45 p-3">
                      <p className="mb-1 text-[10px] font-semibold text-text-secondary">Upcoming</p>
                      <p className="text-[12px] font-semibold">Interview panel on Friday</p>
                      <p className="text-[11px] text-text-secondary">Reminder set for Thursday 9:00</p>
                    </div>

                    <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
                      <p className="mb-1 text-[10px] font-semibold text-primary">Next conversation idea</p>
                      <p className="text-[12px] leading-snug">
                        Ask how the panel went, then send the onboarding article you mentioned.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side buttons */}
        <div className="absolute left-0 top-24 w-1 h-8 bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute left-0 top-36 w-1 h-12 bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute left-0 top-52 w-1 h-12 bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute right-0 top-32 w-1 h-16 bg-[#2a2a2a] rounded-r-sm" />

        {/* "App tour" label below phone */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          <span className="text-xs font-medium text-text-muted">
            Generated app mockup
          </span>
        </div>
      </div>
    </div>
  );
}
