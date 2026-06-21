/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef } from "react";

const STEPS = [
  {
    n: "1",
    t: "Talk about someone",
    d: "After a call or a coffee, record a quick voice note, or type it.",
  },
  {
    n: "2",
    t: "Review & set reminders",
    d: "Glance over what it caught, confirm the dates, and let the reminders fire before each moment.",
  },
  {
    n: "3",
    t: "The profile builds itself",
    d: "Save once and Recall People files everything into a rich profile: essentials, interests, and what’s coming up.",
  },
];

export default function HowItWorks() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const timers: number[] = [];
    let io: IntersectionObserver | undefined;

    /* ---- capture-card waveform ---- */
    const cw = root.querySelector<HTMLElement>("#capWave");
    if (cw && !cw.childElementCount) {
      for (let i = 0; i < 22; i++) {
        const s = document.createElement("span");
        s.style.animationDelay = ((i * 60) % 880) / 1000 + "s";
        cw.appendChild(s);
      }
    }

    /* ---- capture caption cycling ---- */
    const capCap = root.querySelector<HTMLElement>("#capCap");
    const capStates = ["Listening…", "Transcribing…", "Saved ✓"];
    let ci = 0;
    if (capCap) {
      timers.push(
        window.setInterval(() => {
          ci = (ci + 1) % capStates.length;
          capCap.textContent = capStates[ci];
        }, 2100),
      );
    }

    /* ---- coverflow + crossfade text ---- */
    const hPh = Array.from(root.querySelectorAll<HTMLElement>("#howCf .hph"));
    const H = hPh.length;
    const hHead = root.querySelector<HTMLElement>("#howHead");
    const hNum = root.querySelector<HTMLElement>("#hNum");
    const hTitle = root.querySelector<HTMLElement>("#hTitle");
    const hDesc = root.querySelector<HTMLElement>("#hDesc");
    const hDots = Array.from(root.querySelectorAll<HTMLElement>("#howDots .gdot"));

    let hCur = -1;
    let hTimer: number | undefined;
    const H_DUR = 4000;

    function hPlace(c: number) {
      hPh.forEach((p, k) => {
        const d = (k - c + H) % H;
        p.className = "hph";
        if (d === 0) p.classList.add("hcf-c");
        else if (d === 1) p.classList.add("hcf-r");
        else p.classList.add("hcf-l");
      });
      hDots.forEach((dn, k) => dn.classList.toggle("on", k === c));
      if (hCur !== -1 && hHead) hHead.classList.add("fade");
      const prev = hCur;
      window.setTimeout(
        () => {
          if (hNum) hNum.textContent = STEPS[c].n;
          if (hTitle) hTitle.textContent = STEPS[c].t;
          if (hDesc) hDesc.textContent = STEPS[c].d;
          if (hHead) hHead.classList.remove("fade");
        },
        prev === -1 ? 0 : 280,
      );
      hCur = c;
    }
    function hStart() {
      hStop();
      hTimer = window.setInterval(() => hPlace((hCur + 1) % H), H_DUR);
    }
    function hStop() {
      if (hTimer) {
        clearInterval(hTimer);
        hTimer = undefined;
      }
    }

    const dotHandlers = hDots.map((dn, k) => {
      const handler = () => {
        hPlace(k);
        hStart();
      };
      dn.addEventListener("click", handler);
      return handler;
    });

    hPlace(0);

    const howCf = root.querySelector("#howCf");
    if ("IntersectionObserver" in window && howCf) {
      io = new IntersectionObserver(
        (ents) => {
          ents.forEach((e) => (e.isIntersecting ? hStart() : hStop()));
        },
        { threshold: 0.3 },
      );
      io.observe(howCf);
    } else {
      hStart();
    }

    return () => {
      timers.forEach((t) => clearInterval(t));
      hStop();
      io?.disconnect();
      hDots.forEach((dn, k) => dn.removeEventListener("click", dotHandlers[k]));
    };
  }, []);

  return (
    <section className="how" id="how">
      <div className="wrap" ref={rootRef}>
        <div className="sec-head">
          <p className="eyebrow" style={{ textAlign: "center" }}>
            How it works
          </p>
          <h2>Talk for a few seconds. Get a memory that lasts.</h2>
        </div>

        <div className="how-head" id="howHead">
          <span className="hnum" id="hNum">
            1
          </span>
          <h3 id="hTitle">Talk about someone</h3>
          <p id="hDesc">
            After a call or a coffee, record a quick voice note, or type it.
          </p>
        </div>

        <div className="how-cf" id="howCf">
          <div className="hph">
            <div className="cap-card">
              <div className="cap-pill">
                <span className="on">🎙 Voice</span>
                <span>Type</span>
              </div>
              <h4>
                What&apos;s new
                <br />
                <span className="dim">with Leo?</span>
              </h4>
              <div className="cap-wave" id="capWave" />
              <div className="cap-cap" id="capCap">
                Listening…
              </div>
              <div className="cap-mic">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </div>
            </div>
          </div>
          <div className="hph">
            <img
              className="device"
              src="/images/landing-hd/review.png"
              alt="Review screen"
            />
          </div>
          <div className="hph">
            <img
              className="device"
              src="/images/landing-hd/profile.png"
              alt="Structured profile"
            />
          </div>
        </div>

        <div className="how-dots" id="howDots">
          <button type="button" className="gdot" aria-label="Step 1" />
          <button type="button" className="gdot" aria-label="Step 2" />
          <button type="button" className="gdot" aria-label="Step 3" />
        </div>
      </div>
    </section>
  );
}
