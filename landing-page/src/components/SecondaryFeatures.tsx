import { Lock, Globe2, Zap } from 'lucide-react';

const features = [
  {
    icon: Lock,
    title: 'Your data stays yours',
    description: 'Everything is stored locally on your phone. No cloud. No access for anyone but you.',
    iconBg: 'bg-calendar-light',
  },
  {
    icon: Globe2,
    title: 'Speaks your language',
    description: 'English, French, Spanish, German, Italian. Record in any language, Recall understands.',
    iconBg: 'bg-bleu-ciel',
  },
  {
    icon: Zap,
    title: 'Capture in seconds',
    description: 'Open the app, tap record, talk. No menus, no friction. The fastest way to save what matters.',
    iconBg: 'bg-peche',
  },
];

export default function SecondaryFeatures() {
  return (
    <section className="py-24 md:py-32 bg-surface-alt">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-semibold text-center text-text-primary mb-16">
          Built for real life.
        </h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="text-center p-8 rounded-2xl bg-surface border-2 border-border hover:bg-surface-alt transition-all duration-200"
            >
              {/* Icon with filled pastel background */}
              <div className={`w-14 h-14 mx-auto rounded-2xl ${feature.iconBg} border-2 border-border flex items-center justify-center mb-6`}>
                <feature.icon className="w-7 h-7 text-text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">{feature.title}</h3>
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
