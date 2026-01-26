'use client';

import { Player } from '@remotion/player';
import { Mic, Sparkles, FolderOpen, Bell, Search } from 'lucide-react';
import { FeatureAnimation } from '../remotion/FeatureAnimation';

const features = [
  {
    icon: Mic,
    title: 'Voice & Typing',
    description: 'Just talk after a meeting, or type if you prefer. Recall People captures everything naturally.',
    iconBg: 'bg-primary-light',
    iconColor: 'text-primary',
  },
  {
    icon: Sparkles,
    title: 'AI Summaries',
    description: 'Get smart summaries and ice breaker questions to reconnect naturally. No more awkward moments.',
    iconBg: 'bg-menthe',
    iconColor: 'text-voice',
  },
  {
    icon: FolderOpen,
    title: 'Auto-Organized',
    description: 'Contact info, upcoming events, and all your notes — structured automatically. Zero effort.',
    iconBg: 'bg-calendar-light',
    iconColor: 'text-calendar',
  },
  {
    icon: Bell,
    title: 'Event Reminders',
    description: 'Get notified before meetings with who you\'re about to see and what you know about them.',
    iconBg: 'bg-rose',
    iconColor: 'text-error',
  },
  {
    icon: Search,
    title: 'Smart Search',
    description: '"Who works in tech?" Search like you think. No tags, no folders needed.',
    iconBg: 'bg-bleu-ciel',
    iconColor: 'text-primary',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            How it works
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            From voice to organized contacts in seconds. Zero friction.
          </p>
        </div>

        {/* Main content: Animation + Features grid */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left: Remotion Player */}
          <div className="order-2 lg:order-1 flex justify-center">
            <div className="relative">
              {/* Decorative background glow - violet/amber */}
              <div className="absolute inset-0 -m-8 bg-gradient-to-br from-primary-light/50 via-calendar-light/40 to-primary-light/50 rounded-[3rem] blur-2xl" />

              {/* Player container */}
              <div className="relative bg-surface border-2 border-border rounded-3xl overflow-hidden shadow-lg">
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
                    width: 340,
                    height: 400,
                  }}
                />
              </div>

              {/* Floating decorative elements */}
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary-light border-2 border-border rounded-xl flex items-center justify-center text-xl animate-bounce">
                ✨
              </div>
              <div className="absolute -bottom-3 -left-3 w-10 h-10 bg-primary-light border-2 border-border rounded-lg flex items-center justify-center text-lg">
                🎤
              </div>
            </div>
          </div>

          {/* Right: Feature list */}
          <div className="order-1 lg:order-2 space-y-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group flex items-start gap-4 p-4 rounded-2xl bg-surface border-2 border-border hover:bg-surface-alt transition-all duration-200 hover:translate-x-1"
              >
                {/* Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${feature.iconBg} border-2 border-border flex items-center justify-center`}>
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>

                {/* Content */}
                <div>
                  <h3 className="font-semibold text-text-primary mb-1">
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
