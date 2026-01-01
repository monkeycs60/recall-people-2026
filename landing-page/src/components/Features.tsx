import { BrainCircuit, Globe2, Lock, Mic2, Search, Smartphone, Zap } from 'lucide-react';

const features = [
  {
    icon: Mic2,
    title: "Lightning Fast Capture",
    description: "Launch the app, speak. That's it. No need to navigate complex menus to write down a simple number.",
    className: "md:col-span-2",
  },
  {
    icon: BrainCircuit,
    title: "Smart Extraction",
    description: "Our AI understands context, identifies companies, relationships, and key events automatically.",
    className: "",
  },
  {
    icon: Lock,
    title: "Private by Default",
    description: "Local-First Architecture. Your contacts and notes are stored on your phone. No one else has access.",
    className: "",
  },
  {
    icon: Globe2,
    title: "Global by Design",
    description: "Available in 5 languages: English, French, Spanish, German, and Italian. Recall speaks your language.",
    className: "",
  },
  {
    icon: Search,
    title: "Semantic Search",
    description: "Find 'the guy I met at the React conference' without needing his name. Recall understands your natural queries.",
    className: "md:col-span-2",
  },
];

export default function Features() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-primary font-medium tracking-wide uppercase text-sm">Why Recall?</span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6 text-foreground font-serif">
            More than an address book. <br />
            <span className="text-text-secondary">A second brain.</span>
          </h2>
          <p className="text-lg text-text-secondary">
            Designed for entrepreneurs, salespeople, and anyone who meets a lot of people.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`p-8 rounded-3xl bg-white border border-border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${feature.className}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-serif">{feature.title}</h3>
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
