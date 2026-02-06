import Hero from "@/components/Hero";
import Scenario from "@/components/Scenario";
import Features from "@/components/Features";
import SecondaryFeatures from "@/components/SecondaryFeatures";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import ScrollGlows from "@/components/ScrollGlows";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/20 relative">
      <ScrollGlows />
      <Hero />
      <Scenario />
      <Features />
      <SecondaryFeatures />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
