import Link from 'next/link';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '0',
    description: 'Get started with the basics',
    features: [
      'Up to 50 contacts',
      '5 voice notes per month',
      '3 AI searches per month',
      'Basic contact profiles',
      'Local data storage',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '6.99',
    period: '/month',
    description: 'Unlimited power for networkers',
    features: [
      'Unlimited contacts',
      'Unlimited voice notes',
      'Unlimited AI searches',
      'Rich AI-generated profiles',
      'Upcoming events feed',
      'Priority support',
    ],
    cta: 'Go Pro',
    highlighted: true,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground font-serif mb-4">
            Simple pricing
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Start free, upgrade when you need more.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-8 ${
                plan.highlighted
                  ? 'bg-foreground text-white shadow-2xl scale-105'
                  : 'bg-white border border-border'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-white text-sm font-medium px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className={`text-xl font-bold ${plan.highlighted ? 'text-white' : 'text-foreground'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mt-1 ${plan.highlighted ? 'text-white/70' : 'text-text-secondary'}`}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-foreground'}`}>
                  ${plan.price}
                </span>
                {plan.period && (
                  <span className={plan.highlighted ? 'text-white/70' : 'text-text-secondary'}>
                    {plan.period}
                  </span>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                      plan.highlighted ? 'text-primary-light' : 'text-primary'
                    }`} />
                    <span className={plan.highlighted ? 'text-white/90' : 'text-text-secondary'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="#"
                className={`block w-full text-center py-3 px-6 rounded-full font-semibold transition-all ${
                  plan.highlighted
                    ? 'bg-primary text-white hover:bg-primary-dark'
                    : 'bg-foreground text-white hover:bg-foreground/90'
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
