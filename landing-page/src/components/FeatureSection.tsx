import DemoPlaceholder from './DemoPlaceholder';

interface FeatureSectionProps {
  headline: string;
  children: React.ReactNode;
  demoName: string;
  demoCaption: string;
  fallbackImage?: string;
  reverse?: boolean;
  bgColor?: 'background' | 'surface';
}

export default function FeatureSection({
  headline,
  children,
  demoName,
  demoCaption,
  fallbackImage,
  reverse = false,
  bgColor = 'background',
}: FeatureSectionProps) {
  const bgClass = bgColor === 'surface' ? 'bg-surface' : 'bg-background';

  return (
    <section className={`py-24 md:py-32 ${bgClass}`}>
      <div className="container mx-auto px-4">
        <div className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center max-w-6xl mx-auto ${reverse ? '' : ''}`}>
          <div className={reverse ? 'order-2 md:order-2' : 'order-2 md:order-1'}>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground font-serif mb-6">
              {headline}
            </h2>

            <div className="space-y-4 text-lg text-text-secondary leading-relaxed">
              {children}
            </div>
          </div>

          <div className={reverse ? 'order-1 md:order-1' : 'order-1 md:order-2'}>
            <DemoPlaceholder
              demoName={demoName}
              fallbackImage={fallbackImage}
              caption={demoCaption}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
