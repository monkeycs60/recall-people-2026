import { Mic, User, Search } from 'lucide-react';
import PhoneMockup from './PhoneMockup';

const features = [
  {
    icon: Mic,
    title: 'Talk, don\'t type.',
    description: 'After a meeting, just talk. "Met Sarah at the conference, she works at Google, has two kids..." Recall captures everything.',
    screenshot: '/images/screenshots/contact-id-2.png',
    alt: 'Voice recording extraction',
    iconBg: 'bg-primary-light',
  },
  {
    icon: User,
    title: 'Profiles build themselves.',
    description: 'Names, jobs, interests, family — all organized automatically. Plus AI summaries that remind you who they really are.',
    screenshot: '/images/screenshots/contact-id-1.png',
    alt: 'Contact profile view',
    iconBg: 'bg-calendar-light',
  },
  {
    icon: Search,
    title: 'Find anyone instantly.',
    description: '"Who works in tech?" "People from last month\'s conference" — search like you think. No tags, no folders needed.',
    screenshot: '/images/screenshots/contacts-ia-search.png',
    alt: 'Semantic search',
    iconBg: 'bg-bleu-ciel',
  },
];

// Alternating section backgrounds for flat & bold style
const sectionBgs = ['bg-background', 'bg-primary-light/10', 'bg-calendar-light/10'];

export default function Features() {
  return (
    <section id="features" className="py-12 md:py-16">
      {/* Section header */}
      <div className="container mx-auto px-4 mb-10">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">
            How it works
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Three steps. Zero effort. Never forget anyone again.
          </p>
        </div>
      </div>

      {/* Feature rows with alternating backgrounds */}
      {features.map((feature, index) => (
        <div
          key={index}
          className={`py-10 md:py-12 ${sectionBgs[index % sectionBgs.length]}`}
        >
          <div className="container mx-auto px-4">
            <div
              className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-5xl mx-auto ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              {/* Text content card */}
              <div className={`${index % 2 === 1 ? 'lg:order-2' : 'lg:order-1'}`}>
                <div className="bg-surface border-2 border-border rounded-2xl p-8 hover:bg-surface-alt transition-all duration-200">
                  <div className="space-y-6">
                    {/* Icon with filled pastel background */}
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${feature.iconBg} border-2 border-border`}>
                      <feature.icon className="w-7 h-7 text-text-primary" />
                    </div>

                    <div>
                      <span className="text-sm font-semibold text-primary uppercase tracking-wider">
                        Step {index + 1}
                      </span>
                      <h3 className="text-2xl md:text-3xl font-bold text-text-primary mt-2">
                        {feature.title}
                      </h3>
                    </div>

                    <p className="text-lg text-text-secondary leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Phone mockup */}
              <div className={`flex justify-center ${index % 2 === 1 ? 'lg:order-1' : 'lg:order-2'}`}>
                <PhoneMockup
                  src={feature.screenshot}
                  alt={feature.alt}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
