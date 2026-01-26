import Link from 'next/link';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Privacy Policy - Recall People',
  description: 'Privacy Policy for Recall People app. Learn how we handle your data.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Privacy Policy
            </h1>
            <p className="text-text-secondary mb-8">
              Last updated: January 2026
            </p>

            <div className="prose prose-stone max-w-none">
              <section className="mb-10">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  1. Overview
                </h2>
                <p className="text-text-secondary leading-relaxed mb-4">
                  Recall People (&quot;we&quot;, &quot;our&quot;, or &quot;the app&quot;) is a privacy-first personal CRM
                  that helps you remember the people you meet. We are committed to protecting your privacy
                  and being transparent about how we handle your data.
                </p>
                <p className="text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Key principle:</strong> Your personal data stays on your device.
                  We use a local-first architecture, meaning contacts, notes, and memories are stored
                  locally on your phone, not on our servers.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  2. Data We Collect
                </h2>

                <h3 className="text-lg font-medium text-text-primary mb-3 mt-6">
                  2.1 Data Stored Locally on Your Device
                </h3>
                <p className="text-text-secondary leading-relaxed mb-3">
                  The following data is stored only on your device and never uploaded to our servers:
                </p>
                <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
                  <li>Contact information (names, phone numbers, emails, birthdays)</li>
                  <li>Notes and memories about your contacts</li>
                  <li>Voice recordings and their transcriptions</li>
                  <li>AI-generated summaries and conversation starters</li>
                  <li>Groups, tags, and events you create</li>
                  <li>Custom avatars generated for contacts</li>
                </ul>

                <h3 className="text-lg font-medium text-text-primary mb-3 mt-6">
                  2.2 Account Data (if you create an account)
                </h3>
                <p className="text-text-secondary leading-relaxed mb-3">
                  If you create an account, we store on our servers:
                </p>
                <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
                  <li>Email address</li>
                  <li>Name (if provided)</li>
                  <li>Authentication tokens for secure login</li>
                  <li>Subscription status</li>
                </ul>

                <h3 className="text-lg font-medium text-text-primary mb-3 mt-6">
                  2.3 Data Processed Temporarily
                </h3>
                <p className="text-text-secondary leading-relaxed mb-3">
                  When you use voice recording or AI features, data is sent temporarily to our AI providers for processing:
                </p>
                <ul className="list-disc pl-6 text-text-secondary space-y-2">
                  <li><strong>Voice recordings:</strong> Sent to Groq for transcription (using Whisper), then immediately deleted from their servers</li>
                  <li><strong>Text for AI analysis:</strong> Sent to Cerebras to extract contacts and generate summaries, not stored or used for training</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  3. How We Use Your Data
                </h2>
                <ul className="list-disc pl-6 text-text-secondary space-y-2">
                  <li>Transcribe your voice recordings into text</li>
                  <li>Extract contact information and events from your notes</li>
                  <li>Generate AI summaries and conversation starters</li>
                  <li>Create custom avatars for your contacts</li>
                  <li>Answer your questions about your contacts via the Assistant</li>
                  <li>Send you notifications about upcoming events (if enabled)</li>
                  <li>Manage your account and subscription</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  4. Third-Party Services
                </h2>
                <p className="text-text-secondary leading-relaxed mb-4">
                  We use the following third-party services to provide app functionality:
                </p>
                <ul className="list-disc pl-6 text-text-secondary space-y-2">
                  <li><strong>Groq:</strong> Speech-to-text transcription (using Whisper)</li>
                  <li><strong>Cerebras:</strong> AI analysis, contact extraction, and summaries</li>
                  <li><strong>RevenueCat:</strong> Subscription and payment management via App Store / Google Play</li>
                  <li><strong>Google Sign-In:</strong> Optional authentication method</li>
                </ul>
                <p className="text-text-secondary leading-relaxed mt-4">
                  These services process data only as needed to provide their functionality and are bound by their own privacy policies.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  5. Data Storage and Security
                </h2>
                <ul className="list-disc pl-6 text-text-secondary space-y-2">
                  <li>Personal data is stored locally in encrypted SQLite databases on your device</li>
                  <li>Authentication tokens are stored securely using your device&apos;s keychain (iOS) or keystore (Android)</li>
                  <li>All communications with our servers use HTTPS encryption</li>
                  <li>We do not have access to your local data</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  6. AI and Your Data
                </h2>
                <p className="text-text-secondary leading-relaxed mb-4">
                  <strong className="text-text-primary">Your data is never used to train AI models.</strong>
                </p>
                <p className="text-text-secondary leading-relaxed">
                  When you record a note or ask the Assistant a question, your data is sent to our AI providers
                  for processing. This data is processed in real-time and is not stored or used to train
                  their models. We use API configurations that explicitly opt out of data training.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  7. Your Rights
                </h2>
                <p className="text-text-secondary leading-relaxed mb-3">
                  You have full control over your data:
                </p>
                <ul className="list-disc pl-6 text-text-secondary space-y-2">
                  <li><strong>Access:</strong> View all your data directly in the app</li>
                  <li><strong>Export:</strong> Export your data anytime in JSON or CSV format</li>
                  <li><strong>Delete:</strong> Delete individual contacts, notes, or your entire account</li>
                  <li><strong>Portability:</strong> Your exported data can be used elsewhere</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  8. Data Retention
                </h2>
                <ul className="list-disc pl-6 text-text-secondary space-y-2">
                  <li>Local data remains on your device until you delete it</li>
                  <li>If you delete the app, all local data is permanently deleted</li>
                  <li>Account data is retained until you request deletion</li>
                  <li>Voice recordings sent for transcription are deleted immediately after processing</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  9. Children&apos;s Privacy
                </h2>
                <p className="text-text-secondary leading-relaxed">
                  Recall People is not intended for children under 13 years of age. We do not knowingly
                  collect personal information from children under 13. If you believe we have collected
                  such information, please contact us immediately.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  10. Changes to This Policy
                </h2>
                <p className="text-text-secondary leading-relaxed">
                  We may update this privacy policy from time to time. We will notify you of any changes
                  by posting the new policy on this page and updating the &quot;Last updated&quot; date.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  11. Contact Us
                </h2>
                <p className="text-text-secondary leading-relaxed">
                  If you have any questions about this Privacy Policy or our data practices, please contact us at:
                </p>
                <p className="text-text-secondary mt-3">
                  <a href="mailto:privacy@recall-people.com" className="text-primary hover:underline">
                    privacy@recall-people.com
                  </a>
                </p>
              </section>
            </div>

            <div className="mt-12 pt-8 border-t border-border-light">
              <Link
                href="/"
                className="text-primary hover:underline font-medium"
              >
                &larr; Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
