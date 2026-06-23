// PostHog analytics for the Recall People landing page.
//
// Loaded client-side from Layout.astro on every page. Key/host come from
// build-time env vars (PUBLIC_* are exposed to the client by Astro/Vite);
// nothing sensitive lives here — the PostHog project key is write-only.
import posthog from "posthog-js";

const KEY = import.meta.env.PUBLIC_POSTHOG_KEY;
const HOST = import.meta.env.PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

/**
 * Initialise PostHog once, register super-properties, and wire the custom
 * events. No-ops when the key is missing (e.g. local dev without a .env), so
 * the page still renders identically.
 */
export function initAnalytics(): void {
  if (!KEY) return;

  posthog.init(KEY, {
    api_host: HOST,
    ui_host: "https://eu.posthog.com",
    defaults: "2026-05-30",
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    person_profiles: "identified_only",
    session_recording: {
      maskAllInputs: false,
    },
  });

  // Tag every event with product + surface so the EU project can slice cleanly.
  posthog.register({ product: "recall", surface: "landing" });

  wireCustomEvents();
}

/**
 * Delegated listeners — no markup changes, so the design stays pixel-perfect.
 * Re-runnable safely (guarded by a flag) in case of client-side navigation.
 */
function wireCustomEvents(): void {
  if ((window as unknown as { __recallAnalyticsWired?: boolean }).__recallAnalyticsWired) return;
  (window as unknown as { __recallAnalyticsWired?: boolean }).__recallAnalyticsWired = true;

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as Element | null;
      if (!target) return;

      // Navbar "Get the app" CTA (mauve button in the header).
      const navCta = target.closest(".site-header a.btn-mauve");
      if (navCta) {
        posthog.capture("cta_get_the_app_click", {
          location: "navbar",
          href: navCta.getAttribute("href"),
        });
        return;
      }

      // App Store download badge(s).
      const storeBadge = target.closest("a.store");
      if (storeBadge) {
        posthog.capture("cta_app_store_click", {
          href: storeBadge.getAttribute("href"),
        });
        return;
      }

      // FAQ accordion: only count opening an item (not collapsing).
      const faqButton = target.closest<HTMLElement>("#faqList .fq button");
      if (faqButton) {
        const item = faqButton.closest(".fq");
        const wasOpen = item?.classList.contains("open");
        if (!wasOpen) {
          posthog.capture("faq_item_open", {
            question: faqButton.textContent?.trim().replace(/\s+/g, " "),
          });
        }
      }
    },
    // Capture phase so we fire before the FAQ script toggles `.open`.
    true,
  );
}
