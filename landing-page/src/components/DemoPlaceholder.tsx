import Image from 'next/image';

interface DemoPlaceholderProps {
  demoName: string;
  fallbackImage?: string;
  caption: string;
}

export default function DemoPlaceholder({ demoName, fallbackImage, caption }: DemoPlaceholderProps) {
  const gifPath = `/images/demos/${demoName}.gif`;
  const hasGif = false; // Change to true once GIFs are added

  return (
    <div className="relative w-full max-w-[320px] mx-auto">
      <div className="rounded-[2.5rem] border-8 border-white shadow-2xl overflow-hidden bg-white">
        {hasGif ? (
          <Image
            src={gifPath}
            alt={caption}
            width={320}
            height={693}
            className="w-full h-auto"
            unoptimized
          />
        ) : fallbackImage ? (
          <Image
            src={fallbackImage}
            alt={caption}
            width={1170}
            height={2532}
            className="w-full h-auto"
          />
        ) : (
          <div className="aspect-[9/19.5] bg-gradient-to-b from-surface-hover to-surface flex items-center justify-center">
            <div className="text-center px-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-text-secondary text-sm">Demo coming soon</p>
            </div>
          </div>
        )}
      </div>
      <p className="text-center text-sm text-text-muted mt-4">{caption}</p>
    </div>
  );
}
