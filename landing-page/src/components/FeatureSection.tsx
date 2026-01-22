import DemoPlaceholder from './DemoPlaceholder';

interface FeatureSectionProps {
  headline: string;
  children: React.ReactNode;
  demoName: string;
  demoCaption: string;
  fallbackImage?: string;
  reverse?: boolean;
  bgColor?: 'surface' | 'surface-alt' | 'rose' | 'menthe' | 'bleu-ciel';
}

export default function FeatureSection({
  headline,
  children,
  demoName,
  demoCaption,
  fallbackImage,
  reverse = false,
  bgColor = 'surface',
}: FeatureSectionProps) {
  // Map background color options to Tailwind classes
  const bgClasses: Record<string, string> = {
    'surface': 'bg-surface',
    'surface-alt': 'bg-surface-alt',
    'rose': 'bg-rose/10',
    'menthe': 'bg-menthe/10',
    'bleu-ciel': 'bg-bleu-ciel/10',
  };
  const bgClass = bgClasses[bgColor] || 'bg-surface';

  return (
    <section className={`py-24 md:py-32 ${bgClass}`}>
      <div className="container mx-auto px-4">
        <div className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center max-w-6xl mx-auto`}>
          {/* Text content */}
          <div className={reverse ? 'order-2 md:order-2' : 'order-2 md:order-1'}>
            <div className="bg-surface border-2 border-border rounded-2xl p-8 hover:bg-surface-alt transition-all duration-200">
              <h2 className="text-3xl md:text-4xl font-semibold text-text-primary mb-6">
                {headline}
              </h2>

              <div className="space-y-4 text-lg text-text-secondary leading-relaxed">
                {children}
              </div>
            </div>
          </div>

          {/* Demo placeholder */}
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
