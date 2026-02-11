import Link from 'next/link';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '0',
    description: 'Perfect for getting started',
    features: [
      '15 contacts',
      'Unlimited voice notes',
      '5 AI avatars / month',
      'Basic reminders',
      'Local storage only',
    ],
    cta: 'Download & Try',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '4.99',
    period: '/month',
    annualPrice: '49.99',
    description: 'For power networkers',
    features: [
      'Unlimited contacts',
      'Unlimited AI avatars',
      'Priority support',
      'Post-event follow-ups',
      'Advanced relationship insights',
      'Export data anytime',
    ],
    cta: 'Go Pro',
    highlighted: true,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-32 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Simple pricing
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Start for free. Upgrade when your network grows.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl border p-8 transition-all duration-300 ${
                plan.highlighted
                  ? 'bg-surface border-primary/20 shadow-xl shadow-primary/5 scale-105 z-10'
                  : 'bg-surface-alt/50 border-border hover:border-border-dark'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-white text-sm font-semibold px-4 py-1.5 rounded-full shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-text-primary">
                  {plan.name}
                </h3>
                <p className="text-sm mt-1 text-text-secondary">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-text-primary">
                  ${plan.price}
                </span>
                {plan.period && (
                  <span className="text-text-secondary">
                    {plan.period}
                  </span>
                )}
                {plan.annualPrice && (
                  <p className="text-sm text-primary font-medium mt-1">
                    or ${plan.annualPrice}/year (save ~20%)
                  </p>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-full p-0.5 ${plan.highlighted ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'}`}>
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </div>
                    <span className="text-text-secondary text-sm font-medium">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="#"
                className={`block w-full text-center py-3.5 px-6 rounded-xl font-bold transition-all duration-200 hover:-translate-y-0.5 ${
                  plan.highlighted
                    ? 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20'
                    : 'bg-white text-text-primary border border-border hover:border-text-primary/20'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
