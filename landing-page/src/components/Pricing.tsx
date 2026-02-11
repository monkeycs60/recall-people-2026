import Link from 'next/link';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '0',
    description: 'Remember the people who matter',
    features: [
      '14-day full trial',
      '15 contacts',
      'Unlimited notes',
      '5 AI avatars / month',
      '10 assistant questions / month',
      'Basic reminders',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '3.99',
    period: '/month',
    annualPrice: '39.99',
    description: 'Your personal relationship assistant',
    features: [
      'Unlimited contacts',
      'Unlimited AI avatars',
      'Unlimited assistant questions',
      '3-minute recordings',
      'Smart reminders per contact',
      'Weekly relationship digest',
      'Post-event follow-ups',
    ],
    cta: 'Go Pro',
    highlighted: true,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-16 md:py-28 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Simple pricing
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Start with a 14-day free trial. Keep using it forever, upgrade for more.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border-2 border-border p-8 ${
                plan.highlighted
                  ? 'bg-primary-light'
                  : 'bg-white'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-white text-sm font-semibold px-4 py-1.5 rounded-full border-[1.5px] border-border">
                    Popular
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
                  <p className="text-sm text-text-secondary mt-1">
                    or ${plan.annualPrice}/year (save 25%)
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                    <span className="text-text-secondary">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="#"
                className={`block w-full text-center py-3 px-6 rounded-xl font-semibold border-2 border-border transition-all duration-200 hover:-translate-y-0.5 ${
                  plan.highlighted
                    ? 'bg-primary text-white'
                    : 'bg-white text-text-primary'
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
