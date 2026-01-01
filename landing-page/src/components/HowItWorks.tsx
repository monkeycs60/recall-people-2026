import { Mic, Sparkles, UserCheck } from 'lucide-react';

const steps = [
  {
    icon: Mic,
    title: "Speak Naturally",
    description: "Record a voice note after a meeting. Talk about what you learned, just like you would to a friend.",
  },
  {
    icon: Sparkles,
    title: "AI Analysis",
    description: "Our AI models automatically extract names, dates, companies, and relationships from your voice.",
  },
  {
    icon: UserCheck,
    title: "Your CRM is Updated",
    description: "Contact cards are created or enriched without you having to type a single word.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-surface">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-serif text-foreground">
            How it works
          </h2>
          <p className="text-lg text-text-secondary">
            Three simple steps to never forget anything again.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-border -z-10" />
              )}
              
              <div className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm border border-border group-hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>
                
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-text-secondary leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
