import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="September 2026">
      <p>
        Street Vibe (&ldquo;the service&rdquo;) rewrites text into casual and regional styles and can
        read the result aloud with a synthetic voice. By using the service you agree to these terms.
      </p>

      <h2>Who can use it</h2>
      <p>
        You must be old enough to form a binding contract where you live, and at least 13. If you use
        the service on behalf of an organisation, you confirm you may bind that organisation.
      </p>

      <h2>Your content</h2>
      <p>
        You keep ownership of the text you enter and the output you generate. You are responsible for
        what you put in and for how you use what comes out. Do not enter content you do not have the
        right to use, and do not rely on the output for anything where a mistranslation could cause
        harm (legal, medical, financial, safety-critical).
      </p>

      <h2>Acceptable use</h2>
      <p>
        You may not use the service to break the law, to harass or threaten people, to impersonate a
        real person, to generate content sexualising minors, or to create audio intended to deceive
        someone about who is speaking. See the <a href="/content-policy">Content Policy</a> for
        detail. We may suspend accounts that breach these rules.
      </p>

      <h2>Plans and payment</h2>
      <p>
        A free tier with daily limits is available. Pro is a recurring subscription billed through
        Lemon Squeezy, which acts as the merchant of record and handles payment and tax. You can
        cancel at any time and keep Pro access until the end of the period already paid for.
        Except where the law requires otherwise, payments already made are non-refundable.
      </p>

      <h2>Availability and changes</h2>
      <p>
        The service is provided &ldquo;as is&rdquo;, without warranty. Features, limits and pricing
        may change. We may update these terms; continued use after a change means you accept it.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent allowed by law, our total liability for any claim relating to the service is
        limited to the amount you paid us in the three months before the claim.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms can be sent to the contact address shown on our Lemon Squeezy
        checkout page.
      </p>
    </LegalPage>
  );
}
