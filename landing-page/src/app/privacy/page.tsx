import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Recall People",
  description: "Privacy Policy for the Recall People app",
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-serif font-bold mb-2">Privacy Policy</h1>
        <p className="text-text-muted mb-8">Last updated: January 2, 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Overview</h2>
            <p className="text-text-secondary leading-relaxed">
              Recall People (&quot;we&quot;, &quot;our&quot;, or &quot;the App&quot;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.
            </p>
            <p className="text-text-secondary leading-relaxed mt-4">
              <strong className="text-foreground">Our core principle:</strong> Your data stays on your device.
              We follow a local-first architecture, meaning your personal information (contacts, notes, memories)
              is stored locally on your phone, not on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Information We Collect</h2>

            <h3 className="text-lg font-semibold mt-6 mb-3">Data Stored Locally on Your Device</h3>
            <p className="text-text-secondary leading-relaxed mb-3">
              The following data is stored exclusively on your device using encrypted local storage (SQLite):
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Contact information (names, phone numbers, emails, birthdays, photos)</li>
              <li>Voice recordings and their transcriptions</li>
              <li>Notes, facts, and memories about your contacts</li>
              <li>AI-generated summaries and conversation starters</li>
              <li>Groups and tags you create</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">Account Information</h3>
            <p className="text-text-secondary leading-relaxed">
              When you create an account, we collect:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Email address</li>
              <li>Name</li>
              <li>Authentication tokens (stored securely on your device)</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">Data Processed by Our Servers</h3>
            <p className="text-text-secondary leading-relaxed">
              Some features require temporary server-side processing. This data is processed but <strong className="text-foreground">not stored</strong> on our servers:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Audio recordings (for transcription only, deleted immediately after processing)</li>
              <li>Transcription text (for AI extraction, not retained)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Third-Party Services</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              We use the following third-party services to provide our features:
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">Google Sign-In</h3>
            <p className="text-text-secondary leading-relaxed">
              If you choose to sign in with Google, we receive your name and email address from Google.
              See <a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google&apos;s Privacy Policy</a>.
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">RevenueCat (Subscriptions)</h3>
            <p className="text-text-secondary leading-relaxed">
              We use RevenueCat to manage subscriptions and in-app purchases. RevenueCat processes purchase information
              from Apple App Store or Google Play Store.
              See <a href="https://www.revenuecat.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">RevenueCat&apos;s Privacy Policy</a>.
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">AI Processing</h3>
            <p className="text-text-secondary leading-relaxed">
              Audio transcription and text analysis are performed using AI services.
              Your audio and text are processed in real-time and are not stored or used for training purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Device Permissions</h2>
            <p className="text-text-secondary leading-relaxed mb-3">
              The App requests the following permissions:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li><strong className="text-foreground">Microphone:</strong> Required to record voice notes about your contacts</li>
              <li><strong className="text-foreground">Face ID / Biometrics:</strong> Optional, for secure app access</li>
              <li><strong className="text-foreground">Notifications:</strong> Optional, for reminders about upcoming events</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Data Security</h2>
            <p className="text-text-secondary leading-relaxed">
              We implement appropriate security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Local data is stored in encrypted SQLite databases on your device</li>
              <li>Authentication tokens are stored in secure, encrypted storage (Keychain on iOS, Keystore on Android)</li>
              <li>All communications with our servers use HTTPS encryption</li>
              <li>Server-side processing uses secure, temporary storage that is immediately deleted</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Your Rights</h2>
            <p className="text-text-secondary leading-relaxed mb-3">
              You have full control over your data:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li><strong className="text-foreground">Access:</strong> All your data is accessible directly in the App</li>
              <li><strong className="text-foreground">Deletion:</strong> Delete any contact, note, or recording at any time</li>
              <li><strong className="text-foreground">Export:</strong> Your data is stored locally and can be accessed on your device</li>
              <li><strong className="text-foreground">Account Deletion:</strong> Contact us to delete your account and all associated data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Data Retention</h2>
            <p className="text-text-secondary leading-relaxed">
              Since your data is stored locally on your device, it remains there until you delete it or uninstall the App.
              We do not retain copies of your personal content on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Children&apos;s Privacy</h2>
            <p className="text-text-secondary leading-relaxed">
              Recall People is not intended for children under 13 years of age.
              We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Changes to This Policy</h2>
            <p className="text-text-secondary leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting
              the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Contact Us</h2>
            <p className="text-text-secondary leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-primary mt-2">
              <a href="mailto:privacy@recall-people.com" className="hover:underline">
                privacy@recall-people.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
