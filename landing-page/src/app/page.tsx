/* eslint-disable @next/next/no-img-element */
import StoreBadges from "@/components/StoreBadges";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="lp">
      {/* HERO */}
      <span id="top" />
      <section className="hero" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div className="wrap">
          <div className="hero-text">
            <p className="eyebrow">Personal CRM · by voice</p>
            <h1>
              Never forget what matters to{" "}
              <span className="hl">the people who matter.</span>
            </h1>
            <p className="hero-sub">
              After a call or a coffee, just talk. Recall People turns 30 seconds
              of voice into a structured profile — who they are, what they love,
              what&apos;s coming up — and reminds you before it counts.
            </p>
            <div className="hero-cta">
              <StoreBadges />
              <p className="hero-note">
                <span className="dot" /> Live on the App Store · iPhone
              </p>
            </div>
          </div>
          <div className="hero-art">
            <div
              className="blob"
              style={{
                width: 440,
                height: 440,
                background:
                  "radial-gradient(circle,rgba(124,92,255,0.20),transparent 70%)",
                right: 0,
                top: 120,
              }}
            />
            <img
              className="device back"
              src="/images/landing/04-record.png"
              alt="Capture a voice note"
            />
            <img
              className="device front"
              src="/images/landing/02-profile.png"
              alt="A rich contact profile in Recall People"
            />
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="problem">
        <div className="wrap">
          <div className="problem-text">
            <p className="eyebrow">The problem</p>
            <h2>The details slip away between catch-ups.</h2>
            <div className="qs">
              <div className="q">
                <span>“</span>What was her son&apos;s name again?”
              </div>
              <div className="q">
                <span>“</span>Wasn&apos;t he interviewing last week?”
              </div>
              <div className="q">
                <span>“</span>Where was she moving to?”
              </div>
            </div>
            <p className="resolve">
              Not for lack of caring — just for lack of <b>remembering</b>.
            </p>
          </div>
          <div className="problem-art">
            <img
              className="device"
              src="/images/landing/05-upcoming.png"
              alt="Upcoming events feed"
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">How it works</p>
            <h2>Talk for 30 seconds. Get a memory that lasts.</h2>
            <p>
              No forms, no fields. Say what you remember and the app does the
              structuring — then keeps you on time.
            </p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="n">1</div>
              <h3>Talk about someone</h3>
              <p>
                After a call or a coffee, record a quick voice note — or type it.
                Mention who they are, what they like, and what&apos;s coming up.
              </p>
              <div className="shot">
                <img
                  className="device"
                  src="/images/landing/04-record.png"
                  alt="Record a voice note"
                />
              </div>
            </div>
            <div className="step">
              <div className="n">2</div>
              <h3>AI builds the profile</h3>
              <p>
                It transcribes, finds the right contact, and pulls out the
                essentials: details, interests, and upcoming events — dates
                included.
              </p>
              <div className="shot">
                <img
                  className="device"
                  src="/images/landing/02-profile.png"
                  alt="Structured profile"
                />
              </div>
            </div>
            <div className="step">
              <div className="n">3</div>
              <h3>Review &amp; get reminded</h3>
              <p>
                Glance over what it caught, adjust anything, and save. Recall
                schedules the follow-ups so nothing slips.
              </p>
              <div className="shot">
                <img
                  className="device"
                  src="/images/landing/05-upcoming.png"
                  alt="Upcoming reminders"
                />
              </div>
            </div>
          </div>
          <div className="pipeline">
            <span className="pill">Voice note</span>
            <span className="arrow">→</span>
            <span className="pill">Transcription</span>
            <span className="arrow">→</span>
            <span className="pill">Contact detection</span>
            <span className="arrow">→</span>
            <span className="pill">AI extraction</span>
            <span className="arrow">→</span>
            <span className="pill">Review &amp; save</span>
            <span className="arrow">→</span>
            <span className="pill">Reminders</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        style={{
          background: "var(--lav-soft)",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">What you get</p>
            <h2>A memory for every relationship.</h2>
            <p>
              Everything you&apos;d want to remember about someone — captured
              once, organized for you, surfaced at the right time.
            </p>
          </div>

          <div className="feat">
            <div className="feat-text">
              <span className="kicker">
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="#5530E6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v6" />
                  <path d="M5 8h14l-1.5 12.5a2 2 0 0 1-2 1.5h-7a2 2 0 0 1-2-1.5z" />
                </svg>
                Hot topics
              </span>
              <h3>The moments worth following, color-coded by urgency.</h3>
              <p>
                Interviews, moves, trips, a new baby — Recall pulls the events out
                of what you say and dates them automatically. “Next Tuesday”
                becomes a real date, with a color for how soon it is and a push
                before it happens.
              </p>
              <div className="chips">
                <span className="chip">Auto-dated from speech</span>
                <span className="chip">Urgency colors</span>
                <span className="chip">Push notifications</span>
              </div>
            </div>
            <div className="feat-art">
              <img
                className="device"
                src="/images/landing/01-contacts.png"
                alt="Hot topics on contacts"
              />
            </div>
          </div>

          <div className="feat rev">
            <div className="feat-text">
              <span className="kicker">
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="#5530E6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="3" x2="12" y2="21" />
                  <circle cx="12" cy="7" r="2.4" />
                  <circle cx="12" cy="17" r="2.4" />
                </svg>
                Timeline &amp; Upcoming
              </span>
              <h3>See a person&apos;s life — past and what&apos;s next.</h3>
              <p>
                Every contact gets their own timeline: resolved moments behind,
                upcoming ones ahead, birthdays in line. One glance and you&apos;re
                caught up on everything going on with them.
              </p>
              <div className="chips">
                <span className="chip">Per-contact timeline</span>
                <span className="chip">Birthdays</span>
                <span className="chip">Past &amp; upcoming</span>
              </div>
            </div>
            <div className="feat-art">
              <img
                className="device"
                src="/images/landing/07-timeline.png"
                alt="A person's life timeline"
              />
            </div>
          </div>

          <div className="feat">
            <div className="feat-text">
              <span className="kicker">
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="#5530E6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z" />
                </svg>
                Icebreakers
              </span>
              <h3>Always know what to ask next.</h3>
              <p>
                Before you see someone, Recall suggests three thoughtful questions
                — drawn from what it already knows about them. Pick up exactly
                where you left off, every time.
              </p>
              <div className="chips">
                <span className="chip">3 tailored questions</span>
                <span className="chip">Generated from your notes</span>
              </div>
            </div>
            <div className="feat-art">
              <img
                className="device"
                src="/images/landing/03-icebreakers.png"
                alt="Icebreaker suggestions"
              />
            </div>
          </div>

          <div className="feat rev">
            <div className="feat-text">
              <span className="kicker">
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="#5530E6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Ask your network
              </span>
              <h3>Ask anything about your people.</h3>
              <p>
                “Which of my contacts have children?” The assistant answers from
                your own notes and points you to the right people — with the
                sources it used.
              </p>
              <div className="chips">
                <span className="chip">Answers from your notes</span>
                <span className="chip">Cited sources</span>
                <span className="chip">AI summary &amp; loves</span>
              </div>
            </div>
            <div className="feat-art">
              <img
                className="device"
                src="/images/landing/06-assistant.png"
                alt="Assistant answering"
              />
            </div>
          </div>

          <div className="specs" style={{ marginTop: 64 }}>
            <div className="spec">
              <div className="sh">
                <svg viewBox="0 0 24 24" fill="none" stroke="#5530E6" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.5" y2="16.5" />
                </svg>
                <h4>Full-text search</h4>
              </div>
              <p>Find any person or detail instantly across every note you&apos;ve saved.</p>
            </div>
            <div className="spec">
              <div className="sh">
                <svg viewBox="0 0 24 24" fill="none" stroke="#5530E6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="8" r="3" />
                  <circle cx="17" cy="9" r="2.4" />
                  <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
                  <path d="M15 20c0-2 1-3.4 3-3.7" />
                </svg>
                <h4>Groups &amp; sorting</h4>
              </div>
              <p>Organize people into groups; sort by last contact, name, or reminders due.</p>
            </div>
            <div className="spec">
              <div className="sh">
                <svg viewBox="0 0 24 24" fill="none" stroke="#5530E6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6z" />
                </svg>
                <h4>Local-first &amp; synced</h4>
              </div>
              <p>Your data lives on your device (SQLite) and syncs to your account.</p>
            </div>
            <div className="spec">
              <div className="sh">
                <svg viewBox="0 0 24 24" fill="none" stroke="#5530E6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18" />
                  <path d="M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18" />
                </svg>
                <h4>Five languages</h4>
              </div>
              <p>Interface and voice transcription in EN, FR, ES, IT and DE.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="data">
        <div className="wrap">
          <div className="cta">
            <div className="glow" />
            <h2>
              Your voice, turned into
              <br />
              relationship memory.
            </h2>
            <p>
              A personal CRM you simply talk to — structured profiles, real dates,
              and reminders that actually fire. Start with the people who matter
              most.
            </p>
            <StoreBadges />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
