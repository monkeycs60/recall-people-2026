import DemoPlaceholder from './DemoPlaceholder';

export default function DemoHero() {
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center max-w-6xl mx-auto">
          <div className="order-2 md:order-1">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-serif mb-6">
              Talk. That&apos;s it.
            </h2>

            <div className="space-y-4 text-lg text-text-secondary leading-relaxed">
              <p>
                Record a quick voice note after any conversation.
              </p>

              <div className="bg-surface border border-border rounded-2xl p-6 my-6">
                <p className="italic text-foreground">
                  &ldquo;Just had coffee with Sarah. She&apos;s interviewing at Google next week, and she&apos;s finally moving to that new apartment...&rdquo;
                </p>
              </div>

              <p>
                Recall extracts names, facts, dates, and events — <span className="font-semibold text-foreground">automatically</span>.
              </p>

              <p>
                No typing. No organizing. Just talking.
              </p>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <DemoPlaceholder
              demoName="demo-voice-extraction"
              fallbackImage="/images/screenshots/contact-id-1.png"
              caption="Voice note → Structured data in seconds"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
