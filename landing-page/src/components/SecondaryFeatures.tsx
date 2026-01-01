import { Lock, Globe2, Zap } from 'lucide-react';

const features = [
  {
    icon: Lock,
    title: 'Your data stays yours',
    description: 'Everything is stored locally on your phone. No cloud. No access for anyone but you.',
  },
  {
    icon: Globe2,
    title: 'Speaks your language',
    description: 'English, French, Spanish, German, Italian. Record in any language, Recall understands.',
  },
  {
    icon: Zap,
    title: 'Capture in seconds',
    description: 'Open the app, tap record, talk. No menus, no friction. The fastest way to save what matters.',
  },
];

export default function SecondaryFeatures() {
  return (
    <section className="py-24 md:py-32 bg-surface">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground font-serif mb-16">
          Built for real life.
        </h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="text-center p-8 rounded-3xl bg-background border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-serif">{feature.title}</h3>
              <p className="text-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
