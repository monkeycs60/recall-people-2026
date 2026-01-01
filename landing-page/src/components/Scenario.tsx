export default function Scenario() {
  return (
    <section id="scenario" className="py-24 md:py-32 bg-surface">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-text-secondary font-serif">
            Sound familiar?
          </h2>

          <div className="space-y-6 text-lg md:text-xl text-text-secondary leading-relaxed">
            <p>
              You&apos;re at a work event. You meet 10 people in 2 hours.
            </p>

            <p>
              Names, jobs, stories — you nod along, genuinely interested.
            </p>

            <p className="text-foreground font-medium">
              The next morning? Blank.
            </p>

            <p className="italic text-text-muted">
              &ldquo;What was her name again? Something with an S... She had kids, right? Or was that the other one?&rdquo;
            </p>

            <p>
              You&apos;ve been there. Everyone has.
            </p>
          </div>

          <div className="mt-16 md:mt-24 text-center">
            <p className="text-3xl md:text-5xl font-bold text-foreground font-serif leading-tight">
              What if you <span className="text-primary italic">never forgot</span> again?
            </p>
          </div>

          <div className="mt-12 text-center">
            <p className="text-xl text-text-secondary">
              Meet <span className="font-semibold text-foreground">Recall</span> — the app that listens so you don&apos;t have to remember.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
