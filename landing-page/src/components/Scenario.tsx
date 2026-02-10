export default function Scenario() {
  return (
    <section id="scenario" className="py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-sm font-medium text-text-muted text-center mb-12 tracking-[0.2em] uppercase">
            Sound familiar?
          </h2>

          <div className="text-center space-y-6">
            <p className="text-xl md:text-2xl text-text-secondary leading-relaxed">
              You&apos;re at a dinner. You hit it off with this guy.
            </p>

            <p className="text-xl md:text-2xl text-text-primary leading-relaxed font-medium">
              His kids&apos; names. His trip to Japan.
              <br />
              The side project he&apos;s excited about.
            </p>

            <p className="text-2xl md:text-3xl text-text-primary font-bold pt-4">
              Two weeks later?
            </p>

            <p className="text-lg md:text-xl italic text-text-muted leading-relaxed">
              His kids&apos; names&hellip;
              <span className="text-text-muted/60"> his trip to&hellip; where was it?</span>
            </p>

            <p className="text-lg md:text-xl text-text-secondary leading-relaxed pt-2">
              You meet again. He remembers <span className="text-text-primary font-semibold">everything</span> about you.
              <br />
              <span className="text-text-muted">You remember&hellip; nothing.</span>
            </p>
          </div>

          <div className="mt-16 md:mt-20 text-center">
            <p className="text-3xl md:text-5xl font-bold text-text-primary leading-tight">
              Small details make <span className="text-primary italic">big differences</span>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
