import { Star, Shield, Wifi } from 'lucide-react';

const stats = [
  { value: '10k+', label: 'Active users' },
  { value: '4.8', label: 'App Store rating', icon: Star },
  { value: '500k+', label: 'Contacts saved' },
];

const badges = [
  { icon: Shield, label: 'Privacy-first' },
  { icon: Wifi, label: 'Works offline' },
];

export default function SocialProof() {
  return (
    <section className="py-12 bg-background border-y border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          {/* Stats */}
          <div className="flex items-center gap-8 md:gap-12">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {stat.icon && <stat.icon className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
                  <span className="text-2xl md:text-3xl font-bold text-foreground">
                    {stat.value}
                  </span>
                </div>
                <span className="text-sm text-text-muted">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-12 bg-border" />

          {/* Trust badges */}
          <div className="flex items-center gap-6">
            {badges.map((badge, index) => (
              <div key={index} className="flex items-center gap-2 text-text-secondary">
                <badge.icon className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
