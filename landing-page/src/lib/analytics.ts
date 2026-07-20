// PostHog analytics for the Recall People landing page.
//
// Loaded client-side from Layout.astro on every page. Key/host come from
// build-time env vars (PUBLIC_* are exposed to the client by Astro/Vite);
// nothing sensitive lives here — the PostHog project key is write-only.
import posthog from "posthog-js";

const KEY = import.meta.env.PUBLIC_POSTHOG_KEY;
const HOST = import.meta.env.PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const INTERNAL_STORAGE_KEY = "recall_people_posthog_internal";
const INTERNAL_QUERY_PARAM = "posthog_internal";

function applyInternalOrTestMarker(): void {
  try {
    const url = new URL(window.location.href);
    const requested = url.searchParams.get(INTERNAL_QUERY_PARAM);
    if (requested === "1") localStorage.setItem(INTERNAL_STORAGE_KEY, "1");
    if (requested === "0") localStorage.removeItem(INTERNAL_STORAGE_KEY);
    if (requested === "1" || requested === "0") {
      url.searchParams.delete(INTERNAL_QUERY_PARAM);
      window.history.replaceState(window.history.state, "", url);
    }

    if (localStorage.getItem(INTERNAL_STORAGE_KEY) === "1") {
      posthog.register({ $internal_or_test_user: true });
      posthog.setInternalOrTestUser();
    }
  } catch {
    // Analytics must never break navigation when storage is unavailable.
  }
}

/**
 * Initialise PostHog once, register super-properties, and wire the custom
 * events. No-ops when the key is missing (e.g. local dev without a .env), so
 * the page still renders identically.
 */
export function initAnalytics(): void {
  // Guard against double-init: the bundled script can be evaluated more than
  // once, and a second posthog.init() reloads remote config and can stall the
  // event pipeline (no requests ever reach the ingestion host). Window-scoped
  // so the guard holds across separate module instances.
  if (typeof window === "undefined") return;
  const w = window as unknown as { __recallPHInit?: boolean };
  if (!KEY || w.__recallPHInit) return;
  w.__recallPHInit = true;

  posthog.init(KEY, {
    api_host: HOST,
    ui_host: "https://eu.posthog.com",
    defaults: "2026-05-30",
    autocapture: false,
    // Capture manually after privacy super-properties have been registered.
    capture_pageview: false,
    capture_pageleave: true,
    // Error tracking: auto-capture uncaught exceptions + unhandled rejections
    // as $exception events. Best-effort, never blocks rendering.
    capture_exceptions: true,
    person_profiles: "identified_only",
    disable_session_recording: true,
  });

  // Tag every event with product + surface so the EU project can slice cleanly.
  posthog.register({
    product: "recall",
    surface: "landing",
    // Prevent PostHog from enriching events with IP-derived location data.
    $geoip_disable: true,
  });
  applyInternalOrTestMarker();
  posthog.capture("$pageview");

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
