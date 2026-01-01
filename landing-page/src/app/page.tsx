import Hero from "@/components/Hero";
import Scenario from "@/components/Scenario";
import DemoHero from "@/components/DemoHero";
import FeatureSection from "@/components/FeatureSection";
import SecondaryFeatures from "@/components/SecondaryFeatures";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <Hero />

      <Scenario />

      <DemoHero />

      {/* Feature: Upcoming Feed */}
      <FeatureSection
        headline="Never miss what matters."
        demoName="demo-feed-upcoming"
        demoCaption="All upcoming events from your contacts, in one place"
        fallbackImage="/images/screenshots/contacts-list.png"
        reverse={true}
        bgColor="surface"
      >
        <p>
          Your personal radar for the people you care about.
        </p>

        <div className="space-y-2 my-4">
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            Sarah&apos;s job interview? <span className="font-semibold text-foreground">Tomorrow.</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            Marcus&apos;s marathon? <span className="font-semibold text-foreground">Next week.</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            Emma&apos;s sister&apos;s wedding? <span className="font-semibold text-foreground">In 3 days.</span>
          </p>
        </div>

        <p>
          Recall sends you a reminder the day before.
          <br />
          <span className="font-semibold text-foreground">Show up prepared. Every time.</span>
        </p>
      </FeatureSection>

      {/* Feature: Enriched Profiles */}
      <FeatureSection
        headline="Everything you know. One glance."
        demoName="demo-contact-profile"
        demoCaption="A complete profile, built from conversations"
        fallbackImage="/images/screenshots/contact-id-1.png"
        reverse={false}
        bgColor="background"
      >
        <p>
          Job, city, partner&apos;s name, hobbies, kids — it&apos;s all there.
        </p>

        <p>
          Plus an AI-generated summary that tells you who someone really is, not just their LinkedIn headline.
        </p>

        <p className="font-semibold text-foreground">
          You never typed a word. Recall built it from your voice notes.
        </p>
      </FeatureSection>

      {/* Feature: Semantic Search */}
      <FeatureSection
        headline="Find anyone with a question."
        demoName="demo-semantic-search"
        demoCaption="Natural language search across all your contacts"
        fallbackImage="/images/screenshots/contacts-ia-search.png"
        reverse={true}
        bgColor="surface"
      >
        <div className="space-y-2 my-4">
          <p className="bg-background border border-border rounded-xl px-4 py-2 text-foreground">
            &ldquo;Who works in tech?&rdquo;
          </p>
          <p className="bg-background border border-border rounded-xl px-4 py-2 text-foreground">
            &ldquo;Contacts who run marathons&rdquo;
          </p>
          <p className="bg-background border border-border rounded-xl px-4 py-2 text-foreground">
            &ldquo;People I met at the conference&rdquo;
          </p>
        </div>

        <p>
          You don&apos;t need to remember names.
          <br />
          <span className="font-semibold text-foreground">Just describe what you&apos;re looking for.</span>
        </p>
      </FeatureSection>

      <SecondaryFeatures />

      <FinalCTA />

      <Footer />
    </main>
  );
}
