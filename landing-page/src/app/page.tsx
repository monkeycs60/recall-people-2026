import Image from "next/image";
import StoreBadges from "@/components/StoreBadges";
import HowItWorks from "@/components/HowItWorks";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";
import { APP_STORE_URL } from "@/components/Navbar";

function Check({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="lp">
      <span id="top" />

      {/* HERO */}
      <section className="hero" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div className="wrap">
          <div className="hero-text">
            <p className="eyebrow">Personal CRM · by voice</p>
            <h1>
              Never forget what matters to{" "}
              <span className="hl">the people who matter.</span>
            </h1>
            <p className="hero-sub">
              After a call or a coffee, just talk. In a few seconds, Recall
              People turns your voice into a profile, and reminds you before it
              counts.
            </p>
            <StoreBadges />
          </div>
          <div className="hero-art">
            <div
              className="blob"
              style={{
                width: 460,
                height: 460,
                background:
                  "radial-gradient(circle,rgba(124,92,255,0.22),transparent 70%)",
                right: -20,
                top: 120,
              }}
            />
            <Image
              className="device front"
              src="/images/landing-hd/coming-up.png"
              alt="A contact's upcoming timeline in Recall People"
              width={879}
              height={1832}
              sizes="320px"
              priority
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
            <p className="resolve">
              Not for lack of caring, just for lack of <b>remembering</b>.
            </p>
          </div>
          <div className="qlist">
            <p className="q">What was her son&apos;s name again?</p>
            <p className="q">Wasn&apos;t he interviewing last week?</p>
            <p className="q">Where was she moving to?</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <HowItWorks />

      {/* FEATURES: bento */}
      <section id="features">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow" style={{ textAlign: "center" }}>
              What you get
            </p>
            <h2>A memory for every relationship.</h2>
          </div>

          <div className="bento">
            <div className="bt bt-tall shot">
              <div className="bt-k">Coming up</div>
              <h4>Every date, dated.</h4>
              <Image
                className="bt-shot"
                src="/images/landing-hd/upcoming.png"
                alt="The upcoming events screen"
                width={440}
                height={916}
                sizes="(max-width: 560px) 85vw, 250px"
              />
            </div>

            <div className="bt bt-tall shot">
              <div className="bt-k">Icebreakers</div>
              <h4>Know what to say.</h4>
              <Image
                className="bt-shot"
                src="/images/landing-hd/icebreakers.png"
                alt="Icebreaker suggestions"
                width={879}
                height={1832}
                sizes="(max-width: 560px) 85vw, 250px"
              />
            </div>

            <div className="bt bt-wide">
              <div className="bt-k">Smart profile</div>
              <h4>Everything about them, at a glance.</h4>
              <div className="bt-tags">
                <span className="bt-tag">AI summary</span>
                <span className="bt-tag">Tastes</span>
                <span className="bt-tag">Coming up</span>
                <span className="bt-tag">Icebreakers</span>
                <span className="bt-tag">Notes</span>
              </div>
            </div>

            <div className="bt bt-wide">
              <div className="bt-k">AI assistant</div>
              <h4>Ask anything about your people.</h4>
              <div className="b-chat">
                <div className="cb cb-q">Which of my contacts have kids?</div>
                <div className="cb cb-a">
                  Elena Rossi has two; Marcus just had his first.
                </div>
              </div>
            </div>

            <div className="bt bt-tall shot">
              <div className="bt-k">Smart notifications</div>
              <h4>The right nudge, on time.</h4>
              <Image
                className="bt-shot"
                src="/images/landing-hd/notifications.png"
                alt="Smart notifications"
                width={879}
                height={1832}
                sizes="(max-width: 560px) 85vw, 250px"
              />
            </div>

            <div className="bt">
              <div className="bt-k">Hot topics</div>
              <h4>Color-coded urgency.</h4>
              <div className="b-topics">
                <div className="tp">
                  <span className="td td-r" />
                  Urgent<span className="tt tt-r">Days</span>
                </div>
                <div className="tp">
                  <span className="td td-a" />
                  Soon<span className="tt tt-a">Weeks</span>
                </div>
                <div className="tp">
                  <span className="td td-g" />
                  Later<span className="tt tt-g">Months</span>
                </div>
              </div>
            </div>

            <div className="bt bt-wide">
              <div className="bt-k">Story &amp; timeline</div>
              <h4>Their whole life, one scroll.</h4>
              <div className="b-tl">
                <div className="tlr">
                  <span className="tld" />
                  Met at Sarah&apos;s dinner
                </div>
                <div className="tlr">
                  <span className="tld" />
                  FormFlow demo · Jul 8
                </div>
                <div className="tlr">
                  <span className="tld" />
                  Web Summit · Nov
                </div>
              </div>
            </div>

            <div className="bt">
              <div className="bt-k">Five languages</div>
              <h4>Speak their language.</h4>
              <div className="b-langs">
                <span className="lg on">EN</span>
                <span className="lg">FR</span>
                <span className="lg">ES</span>
                <span className="lg">IT</span>
                <span className="lg">DE</span>
              </div>
            </div>

            <div className="bt bt-wide bt-priv">
              <div className="priv-ic">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6z" />
                </svg>
              </div>
              <div>
                <div className="bt-k">Private by design</div>
                <h4>Local-first &amp; yours alone.</h4>
                <p className="bt-d">
                  Your network lives on your device and syncs only to you. No
                  feeds, no sharing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="pricing">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow" style={{ textAlign: "center" }}>
              Pricing
            </p>
            <h2>Start free. Upgrade when it sticks.</h2>
          </div>
          <div className="tiers">
            <div className="tier">
              <p className="tname">Free</p>
              <div className="price">€0</div>
              <p className="psub">For keeping your closest circle in mind.</p>
              <ul>
                <li>
                  <Check color="#1FB877" />
                  Up to 15 contacts
                </li>
                <li>
                  <Check color="#1FB877" />
                  Voice &amp; text notes
                </li>
                <li>
                  <Check color="#1FB877" />
                  Timelines &amp; reminders
                </li>
                <li>
                  <Check color="#1FB877" />
                  All five languages
                </li>
              </ul>
              <a
                className="tbtn ghost"
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener"
              >
                Get started
              </a>
            </div>
            <div className="tier featured">
              <span className="tag">Most popular</span>
              <p className="tname">Premium</p>
              <div className="price">
                €4.99<span> / month</span>
              </div>
              <p className="psub">For your whole network, with AI on top.</p>
              <ul>
                <li>
                  <Check color="#5530E6" />
                  Unlimited contacts
                </li>
                <li>
                  <Check color="#5530E6" />
                  Ask your network (AI assistant)
                </li>
                <li>
                  <Check color="#5530E6" />
                  Unlimited icebreakers &amp; summaries
                </li>
                <li>
                  <Check color="#5530E6" />
                  Priority transcription
                </li>
              </ul>
              <a
                className="tbtn solid"
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener"
              >
                Go Premium
              </a>
            </div>
          </div>
          <p className="price-note">
            Or €39.99 / year (two months free). Cancel anytime.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <Faq />

      {/* CTA */}
      <section id="data" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <div className="cta">
            <div className="glow" />
            <h2>
              Your voice, turned into
              <br />
              relationship memory.
            </h2>
            <p>
              Structured profiles, real dates, and reminders that actually fire.
              Start with the people who matter most.
            </p>
            <StoreBadges />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
