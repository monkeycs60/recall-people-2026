import Link from "next/link";
import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service - Recall People",
  description: "Terms of Service for the Recall People app",
};

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Terms of Service
            </h1>
            <p className="text-text-secondary mb-8">Last updated: January 2, 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-text-secondary leading-relaxed">
              By downloading, installing, or using Recall People (&quot;the App&quot;), you agree to be bound by these
              Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not use the App.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">2. Description of Service</h2>
            <p className="text-text-secondary leading-relaxed">
              Recall People is a personal CRM application that helps you remember important details about the people
              in your life. The App allows you to:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mt-3">
              <li>Record voice notes about your contacts</li>
              <li>Automatically transcribe and extract information from recordings</li>
              <li>Store and organize contact information, notes, and memories</li>
              <li>Receive reminders about upcoming events related to your contacts</li>
              <li>Search your contacts using natural language</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">3. Account Registration</h2>
            <p className="text-text-secondary leading-relaxed">
              To use certain features of the App, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mt-3">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
              <li>Be responsible for all activities that occur under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">4. Subscriptions and Payments</h2>
            <p className="text-text-secondary leading-relaxed">
              Recall People offers both free and premium subscription plans.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">Free Plan</h3>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Limited to 5 notes per month</li>
              <li>Maximum 60-second recording duration</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">Premium Plan (Recall People Pro)</h3>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Unlimited notes</li>
              <li>Up to 3-minute recording duration</li>
              <li>Priority support</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">Billing</h3>
            <p className="text-text-secondary leading-relaxed">
              Subscriptions are billed through the Apple App Store or Google Play Store.
              By subscribing, you agree to their respective terms and conditions.
              Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">Refunds</h3>
            <p className="text-text-secondary leading-relaxed">
              Refund requests are handled by Apple or Google according to their respective refund policies.
              We do not process refunds directly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">5. User Content</h2>
            <p className="text-text-secondary leading-relaxed">
              You retain ownership of all content you create in the App, including voice recordings, notes, and contact information.
              You are solely responsible for:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mt-3">
              <li>The accuracy and legality of your content</li>
              <li>Ensuring you have the right to record and store information about others</li>
              <li>Backing up your data (since it is stored locally on your device)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">6. Acceptable Use</h2>
            <p className="text-text-secondary leading-relaxed">
              You agree not to use the App to:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mt-3">
              <li>Violate any applicable laws or regulations</li>
              <li>Record conversations without proper consent where required by law</li>
              <li>Store or process information about others without their knowledge where legally required</li>
              <li>Attempt to reverse engineer, decompile, or disassemble the App</li>
              <li>Circumvent any security features or usage limits</li>
              <li>Use the App for any commercial purpose without our written consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">7. Intellectual Property</h2>
            <p className="text-text-secondary leading-relaxed">
              The App, including its design, features, and content (excluding user content), is owned by Recall People
              and protected by intellectual property laws. You are granted a limited, non-exclusive, non-transferable
              license to use the App for personal, non-commercial purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">8. Disclaimer of Warranties</h2>
            <p className="text-text-secondary leading-relaxed">
              THE APP IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mt-3">
              <li>The App will be uninterrupted or error-free</li>
              <li>Transcriptions or AI-generated content will be accurate</li>
              <li>The App will meet your specific requirements</li>
              <li>Any data stored on your device will be preserved indefinitely</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">9. Limitation of Liability</h2>
            <p className="text-text-secondary leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, RECALL PEOPLE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, LOSS OF PROFITS,
              OR LOSS OF RELATIONSHIPS, ARISING FROM YOUR USE OF THE APP.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">10. Indemnification</h2>
            <p className="text-text-secondary leading-relaxed">
              You agree to indemnify and hold harmless Recall People and its affiliates from any claims, damages,
              or expenses arising from your use of the App or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">11. Termination</h2>
            <p className="text-text-secondary leading-relaxed">
              We may suspend or terminate your access to the App at any time for violation of these Terms
              or for any other reason at our discretion. Upon termination:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mt-3">
              <li>Your right to use the App will immediately cease</li>
              <li>Your locally stored data will remain on your device unless you delete it</li>
              <li>Any active subscription will be cancelled</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">12. Changes to Terms</h2>
            <p className="text-text-secondary leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of significant changes
              through the App or by email. Your continued use of the App after changes constitutes acceptance
              of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">13. Governing Law</h2>
            <p className="text-text-secondary leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of France,
              without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">14. Contact</h2>
            <p className="text-text-secondary leading-relaxed">
              For questions about these Terms, please contact us at:
            </p>
            <p className="text-primary mt-2">
              <a href="mailto:legal@recall-people.com" className="hover:underline">
                legal@recall-people.com
              </a>
            </p>
          </section>
        </div>

            <div className="mt-12 pt-8 border-t border-border-light">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-primary text-text-primary hover:text-white font-semibold rounded-xl border-2 border-border transition-all duration-200 hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
