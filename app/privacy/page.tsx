import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="September 2026">
      <p>
        This page explains what Street Vibe collects and why. The short version: we process your
        messages to translate them, we do not sell your data, and we keep as little as possible.
      </p>

      <h2>What we process</h2>
      <ul>
        <li>
          <strong>The text you enter.</strong> It is sent to our translation and voice providers
          (Google, Replicate, ElevenLabs) to produce the result and is not stored on our servers
          afterwards. Your recent phrases are saved only in your own browser for the history panel,
          and you can clear them there.
        </li>
        <li>
          <strong>Account data (if you sign in).</strong> Sign-in is handled by Clerk. We store your
          user id, email address and plan so we can apply your daily limit and, for Pro, your
          subscription status.
        </li>
        <li>
          <strong>Anonymous usage counts.</strong> For visitors who are not signed in we store a
          one-way hash of your IP address so we can enforce the free daily limit. The raw IP address
          is not stored.
        </li>
        <li>
          <strong>Payment data.</strong> Handled entirely by Lemon Squeezy as merchant of record. We
          receive your subscription status and a customer id, never your card details.
        </li>
        <li>
          <strong>Basic analytics.</strong> Aggregate, privacy-friendly event counts (for example
          &ldquo;a translation succeeded&rdquo;) with no advertising trackers.
        </li>
      </ul>

      <h2>Why</h2>
      <p>
        To run the service, apply fair usage limits, process subscriptions, and understand which
        features are used. We do not use your content to train models and we do not sell personal
        data.
      </p>

      <h2>Retention</h2>
      <p>
        Usage counters roll over daily. Account records are kept while your account exists and removed
        on request. Provider logs follow each provider&apos;s own retention policy.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Use the service without an account to avoid storing account data.</li>
        <li>Clear the on-device history from the history panel at any time.</li>
        <li>Ask us to delete your account data using the contact route below.</li>
      </ul>

      <h2>Sub-processors</h2>
      <p>
        Clerk (authentication), Supabase (usage database), Google and Replicate (translation),
        ElevenLabs and Replicate/MiniMax (voice), Lemon Squeezy (payments), Vercel (hosting).
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions and deletion requests can be sent to the contact address shown on our
        Lemon Squeezy checkout page.
      </p>
    </LegalPage>
  );
}
