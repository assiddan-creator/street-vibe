import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "Content Policy",
  robots: { index: true, follow: true },
};

export default function ContentPolicyPage() {
  return (
    <LegalPage title="Content Policy" updated="September 2026">
      <p>
        Street Vibe is for everyday messaging — helping you sound natural in a language that
        isn&apos;t your first. These rules keep it that way and reflect the terms of the AI providers
        behind it.
      </p>

      <h2>Don&apos;t use Street Vibe to</h2>
      <ul>
        <li>Harass, bully, threaten, or incite violence against anyone.</li>
        <li>Produce hate speech targeting people for who they are.</li>
        <li>Create sexual content involving minors, in any form.</li>
        <li>Impersonate a real person or organisation, or pass off generated audio as a real
          recording of someone.</li>
        <li>Generate a voice intended to mislead a listener about who is speaking (no voice cloning
          or deepfake use).</li>
        <li>Run scams, phishing, or coordinated spam.</li>
        <li>Break the law or facilitate serious harm.</li>
      </ul>

      <h2>Your responsibility</h2>
      <p>
        The output is a draft suggestion, not a guaranteed accurate translation. You decide what to
        send and to whom, and you are responsible for that. Slang and tone vary by person and place;
        read the result before you use it.
      </p>

      <h2>Enforcement</h2>
      <p>
        We may block requests, limit features, or suspend accounts that break this policy. Serious or
        repeated abuse may be reported to the relevant provider or authority.
      </p>

      <h2>Contact</h2>
      <p>
        To report misuse, use the contact address shown on our Lemon Squeezy checkout page.
      </p>
    </LegalPage>
  );
}
