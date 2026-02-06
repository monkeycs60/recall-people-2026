'use client';

import { Player } from '@remotion/player';
import { Mic, Sparkles, FolderOpen, Bell, Search } from 'lucide-react';
import { FeatureAnimation } from '../remotion/FeatureAnimation';

const features = [
  {
    icon: Mic,
    title: 'Voice-first capture',
    description: 'Just talk after a meeting. Recall People turns your words into a rich contact profile.',
    iconBg: 'bg-primary-light',
    iconColor: 'text-primary',
  },
  {
    icon: FolderOpen,
    title: 'Auto-organized profiles',
    description: 'Each person gets their own card — name, job, interests, events, contact info — all filled in for you.',
    iconBg: 'bg-calendar-light',
    iconColor: 'text-calendar',
  },
  {
    icon: Bell,
    title: 'Event reminders',
    description: 'Get notified before important dates so you always show up prepared.',
    iconBg: 'bg-rose',
    iconColor: 'text-error',
  },
  {
    icon: Search,
    title: 'Smart search',
    description: '"Who works in tech?" Search across all your profiles like you think.',
    iconBg: 'bg-bleu-ciel',
    iconColor: 'text-primary',
  },
  {
    icon: Sparkles,
    title: 'AI summaries',
    description: 'Get summaries and conversation starters to reconnect naturally.',
    iconBg: 'bg-menthe',
    iconColor: 'text-voice',
  },
];

export default function Features() {
  return (
    <section id="how-it-works" className="py-16 md:py-28 relative">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            How it works
          </h2>
          <p className="text-lg text-text-secondary max-w-xl mx-auto">
            Talk about someone. Recall People builds their profile.
          </p>
        </div>

        {/* Main content: Animation + Features grid */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left: Remotion Player */}
          <div className="order-2 lg:order-1 flex justify-center w-full">
            <div className="relative w-full lg:max-w-[340px]">
              {/* Player container */}
              <div className="relative bg-surface border border-border-light rounded-2xl md:rounded-3xl overflow-hidden shadow-sm">
                <Player
                  component={FeatureAnimation}
                  durationInFrames={720}
                  compositionWidth={340}
                  compositionHeight={400}
                  fps={30}
                  loop
                  autoPlay
                  acknowledgeRemotionLicense
                  style={{
                    width: '100%',
                    height: 'auto',
                    aspectRatio: '340 / 400',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right: Feature list */}
          <div className="order-1 lg:order-2 space-y-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group flex items-start gap-4 p-4 rounded-xl hover:bg-surface transition-colors duration-200"
              >
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${feature.iconBg} flex items-center justify-center`}>
                  <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                </div>

                {/* Content */}
                <div>
                  <h3 className="font-semibold text-text-primary mb-0.5">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
