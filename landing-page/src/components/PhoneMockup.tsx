import Image from 'next/image';

interface PhoneMockupProps {
  src: string;
  alt: string;
  className?: string;
}

export default function PhoneMockup({ src, alt, className = '' }: PhoneMockupProps) {
  return (
    <div className={`relative ${className}`}>
      {/* iPhone frame - responsive width */}
      <div className="relative mx-auto w-[240px] sm:w-[280px]">
        {/* Phone body */}
        <div className="relative bg-[#1a1a1a] rounded-[3rem] p-2 shadow-2xl">
          {/* Screen bezel */}
          <div className="relative bg-black rounded-[2.5rem] overflow-hidden">
            {/* Dynamic Island */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-7 bg-black rounded-full z-20" />

            {/* Screen content */}
            <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.5rem]">
              <Image
                src={src}
                alt={alt}
                fill
                className="object-cover object-top"
                priority
              />
            </div>
          </div>
        </div>

        {/* Side buttons */}
        <div className="absolute left-0 top-24 w-1 h-8 bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute left-0 top-36 w-1 h-12 bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute left-0 top-52 w-1 h-12 bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute right-0 top-32 w-1 h-16 bg-[#2a2a2a] rounded-r-sm" />
      </div>
    </div>
  );
}
