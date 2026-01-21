import { Mic, User, Search } from 'lucide-react';
import PhoneMockup from './PhoneMockup';

const features = [
  {
    icon: Mic,
    title: 'Talk, don\'t type.',
    description: 'After a meeting, just talk. "Met Sarah at the conference, she works at Google, has two kids..." Recall captures everything.',
    screenshot: '/images/screenshots/contact-id-2.png',
    alt: 'Voice recording extraction',
  },
  {
    icon: User,
    title: 'Profiles build themselves.',
    description: 'Names, jobs, interests, family — all organized automatically. Plus AI summaries that remind you who they really are.',
    screenshot: '/images/screenshots/contact-id-1.png',
    alt: 'Contact profile view',
  },
  {
    icon: Search,
    title: 'Find anyone instantly.',
    description: '"Who works in tech?" "People from last month\'s conference" — search like you think. No tags, no folders needed.',
    screenshot: '/images/screenshots/contacts-ia-search.png',
    alt: 'Semantic search',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-surface">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground font-serif mb-4">
            How it works
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Three steps. Zero effort. Never forget anyone again.
          </p>
        </div>

        <div className="space-y-24 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              {/* Text */}
              <div className={`space-y-6 ${index % 2 === 1 ? 'lg:order-2' : 'lg:order-1'}`}>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>

                <div>
                  <span className="text-sm font-medium text-primary uppercase tracking-wider">
                    Step {index + 1}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif mt-2">
                    {feature.title}
                  </h3>
                </div>

                <p className="text-lg text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Phone mockup */}
              <div className={`flex justify-center ${index % 2 === 1 ? 'lg:order-1' : 'lg:order-2'}`}>
                <PhoneMockup
                  src={feature.screenshot}
                  alt={feature.alt}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
