import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Archivo } from "next/font/google";
import { LandingExperience, type ExperienceStop } from "@/components/landing/LandingExperience";
import { CITY_STOPS, TOURIST_LINE } from "@/lib/landingCities";
import "./landing.css";

/** One family from extra-condensed to expanded: the width axis is the page's motion. */
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const FEATURES: { title: string; body: string }[] = [
  {
    title: "Eleven real dialects",
    body: "Not a generic casual setting. Kingston, London, Brooklyn, Tokyo, Paris, Moscow, CDMX, Rio, Tel Aviv, Cairo and Madrid, each tuned by a native voice.",
  },
  {
    title: "Hear it out loud",
    body: "An AI voice reads the line back in the accent, so you know how it lands before you hit send.",
  },
  {
    title: "Does this sound local?",
    body: "Paste what you already wrote. Get a score, a cleaned up version, and exactly what gave you away.",
  },
  {
    title: "Dial the intensity",
    body: "From barely there local color to full slang. Pick the vibe (DM, flirt, argument, hype) and it matches.",
  },
];

const STEPS: { title: string; body: string }[] = [
  { title: "Type it plain", body: "Write what you mean in your own words, in any language." },
  { title: "Pick a place and a vibe", body: "Choose the dialect and how strong you want it." },
  { title: "Send it like a local", body: "Copy the line, hear it, or check something you wrote yourself." },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Which languages does it cover?",
    a: "Spanish, French, German, Italian, Portuguese, Russian, Japanese, Arabic, Hebrew and English as standard languages, plus 11 street dialects on top of them.",
  },
  {
    q: "Is my text stored?",
    a: "Your recent phrases are kept only in your own browser, for the history panel. The server processes each message to translate it and does not keep a copy.",
  },
  {
    q: "How accurate is the slang?",
    a: "Each dialect is shaped by a native speaker profile, not a dictionary swap. It is built for everyday chat, not legal or medical text.",
  },
  {
    q: "Can I cancel Pro anytime?",
    a: "Yes. One click in the billing portal. You keep Pro until the end of the period you already paid for.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Street Vibe",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      url: "https://www.getstreetvibe.com/",
      description:
        "Rewrites your message the way someone who lives there would send it, in 11 street dialects, with an AI voice to read it aloud.",
      offers: [
        { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
        { "@type": "Offer", name: "Pro monthly", price: "3.99", priceCurrency: "USD" },
        { "@type": "Offer", name: "Pro yearly", price: "23.99", priceCurrency: "USD" },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
};

const EXPERIENCE_STOPS: ExperienceStop[] = CITY_STOPS.map((s) => ({
  city: s.city,
  lat: s.lat,
  lon: s.lon,
  hello: s.hello,
  display: s.display,
  field: s.field,
  ink: s.ink,
}));

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Words as their own boxes, so a line can land one word at a time. Text stays real text. */
function Words({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span key={i}>
          <span className="lv-w" style={{ "--i": i } as CSSProperties}>
            <span>{word}</span>
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

function OpenButton({ label, onField = false }: { label: string; onField?: boolean }) {
  return (
    <Link href="/app" className={`lv-btn${onField ? " lv-btn--onfield" : ""}`}>
      <span className="lv-btn__flood" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="lv-btn__label">{label}</span>
      <svg className="lv-btn__arrow" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

export default function Landing() {
  const first = CITY_STOPS[0];
  const rootVars = {
    "--g1": first.display[0],
    "--g2": first.display[1],
    "--g3": first.display[2],
    "--field": first.field,
    "--field-ink": first.ink,
  } as CSSProperties;

  return (
    <div className={`lv ${archivo.variable}`} data-lv-root style={rootVars}>
      <a className="lv-skip" href="#main">
        Skip to content
      </a>

      <header className="lv-header">
        <Link href="/" className="lv-mark" aria-label="Street Vibe, home">
          Street Vibe
        </Link>
        <nav className="lv-nav" aria-label="Primary">
          <a href="#tour" className="lv-nav__link">
            The tour
          </a>
          <a href="#pricing" className="lv-nav__link">
            Pricing
          </a>
          <a href="#faq" className="lv-nav__link">
            Questions
          </a>
          <Link href="/app" className="lv-pill">
            Open the app
          </Link>
        </nav>
      </header>

      <main id="main">
        <div className="lv-voyage" data-lv-voyage>
          <section className="lv-hero" data-lv-hero aria-labelledby="lv-h1">
            <div className="lv-horizon" aria-hidden="true" />
            <h1 id="lv-h1" className="lv-h1">
              <span className="lv-h1__row">
                <span style={{ "--i": 0 } as CSSProperties}>Talk like</span>{" "}
                <span style={{ "--i": 1 } as CSSProperties}>a local,</span>
              </span>{" "}
              <span className="lv-h1__row">
                <span style={{ "--i": 2 } as CSSProperties}>not a</span>{" "}
                <span className="lv-strike" style={{ "--i": 3 } as CSSProperties}>
                  tourist.
                  <svg viewBox="0 0 260 60" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M4 36 C 44 18, 78 50, 124 30 S 204 20, 256 34" pathLength="1" />
                  </svg>
                </span>
              </span>
            </h1>
            <div className="lv-hero__foot">
              <p className="lv-lede">
                Street Vibe rewrites your message the way someone who lives there would send it. Eleven street
                dialects, each one read aloud by an AI voice in the accent.
              </p>
              <p className="lv-cue" aria-hidden="true">
                Scroll to send one hello around the world
              </p>
              <div className="lv-hero__cta">
                <OpenButton label="Open Street Vibe, it's free" />
                <p className="lv-fine">No sign-up to try. 10 free rewrites a day.</p>
              </div>
            </div>
          </section>

          <section className="lv-stage" data-lv-stage id="tour" aria-labelledby="lv-tour-h">
            <div className="lv-host" data-lv-host="stage" aria-hidden="true" />
            <div className="lv-bigname" data-lv-bigname aria-hidden="true">
              <span data-lv-bigname-text suppressHydrationWarning />
            </div>
            <span className="lv-measure" data-lv-measure aria-hidden="true" suppressHydrationWarning />

            <div className="lv-stage__ui">
              <div className="lv-stage__head">
                <h2 id="lv-tour-h" className="lv-stage__title">
                  One line, eleven streets
                </h2>
                <p className="lv-stage__sub">The same hello, the way each city would actually send it.</p>
              </div>

              <ol className="lv-stops">
                {CITY_STOPS.map((s, i) => (
                  <li
                    key={s.dialect}
                    className="lv-stop"
                    data-lv-stop
                    data-active={i === 0 ? "" : undefined}
                    style={{ "--f": s.field, "--fi": s.ink, "--d1": s.display[0] } as CSSProperties}
                  >
                    <div className="lv-stop__meta">
                      <span className="lv-stop__n">
                        {pad2(i + 1)} / {pad2(CITY_STOPS.length)}
                      </span>
                      <h3>{s.city}</h3>
                      <span>{s.speech}</span>
                    </div>
                    <div className="lv-thread">
                      <p className="lv-bubble lv-bubble--plain">
                        <span className="lv-bubble__tag">You type</span>
                        {TOURIST_LINE}
                      </p>
                      <p className="lv-bubble lv-bubble--local">
                        <span className="lv-bubble__tag">{s.city} says</span>
                        <span lang={s.lang} dir={s.dir} className="lv-bubble__line">
                          <Words text={s.local} />
                        </span>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <nav className="lv-index" aria-label="Cities on the tour">
                {CITY_STOPS.map((s, i) => (
                  <button key={s.dialect} type="button" data-lv-goto={i} aria-current={i === 0 ? "true" : undefined}>
                    <span>{s.city}</span>
                  </button>
                ))}
              </nav>

              <div className="lv-stage__foot">
                <p className="lv-next" data-lv-next suppressHydrationWarning>
                  Next stop: {CITY_STOPS[1].city}
                </p>
                <a href="#kit" className="lv-link">
                  Skip the tour
                </a>
              </div>
            </div>
          </section>
          <div className="lv-track" aria-hidden="true" />
        </div>

        <section className="lv-sec lv-kit" id="kit" aria-labelledby="lv-kit-h">
          <h2 id="lv-kit-h" className="lv-h2" data-lv-reveal>
            Built for the group chat, not the classroom.
          </h2>
          <ul className="lv-rows">
            {FEATURES.map((f, i) => (
              <li key={f.title} data-lv-reveal style={{ "--d": i } as CSSProperties}>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="lv-sec lv-how" id="how" aria-labelledby="lv-how-h">
          <h2 id="lv-how-h" className="lv-h2" data-lv-reveal>
            Three moves. No phrasebook.
          </h2>
          <ol className="lv-steps">
            {STEPS.map((s, i) => (
              <li key={s.title} data-lv-reveal style={{ "--d": i } as CSSProperties}>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="lv-sec lv-pricing" id="pricing" aria-labelledby="lv-pricing-h">
          <h2 id="lv-pricing-h" className="lv-h2" data-lv-reveal>
            Free to try. Cheap to keep.
          </h2>
          <div className="lv-plans">
            <article className="lv-plan lv-plan--free" data-lv-reveal>
              <h3>Free</h3>
              <p className="lv-price">
                $0 <span>forever</span>
              </p>
              <ul>
                <li>10 rewrites + 2 voice plays a day</li>
                <li>All 11 dialects</li>
                <li>No sign-up to start</li>
              </ul>
            </article>
            <article className="lv-plan lv-plan--pro" data-lv-reveal style={{ "--d": 1 } as CSSProperties}>
              <h3>Pro</h3>
              <p className="lv-price">
                $3.99 <span>a month</span>
              </p>
              <p className="lv-plan__alt">or $23.99 a year</p>
              <ul>
                <li>Unlimited rewrites and voice</li>
                <li>Unlimited &ldquo;Does this sound local?&rdquo; checks</li>
                <li>Cancel anytime</li>
              </ul>
              <OpenButton label="Start free, upgrade in the app" onField />
            </article>
          </div>
        </section>

        <section className="lv-sec lv-faq" id="faq" aria-labelledby="lv-faq-h">
          <h2 id="lv-faq-h" className="lv-h2" data-lv-reveal>
            Fair questions.
          </h2>
          <div className="lv-faq__list">
            {FAQ.map((item, i) => (
              <details key={item.q} data-lv-reveal style={{ "--d": i } as CSSProperties}>
                <summary>{item.q}</summary>
                <p>
                  {item.a}
                  {item.q === "Is my text stored?" ? (
                    <>
                      {" "}
                      <Link href="/privacy" className="lv-link">
                        Read the Privacy page
                      </Link>
                    </>
                  ) : null}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="lv-outro" data-lv-outro aria-labelledby="lv-outro-h">
          <div className="lv-host" data-lv-host="outro" aria-hidden="true" />
          <div className="lv-horizon" aria-hidden="true" />
          <h2 id="lv-outro-h" className="lv-h1 lv-outro__title" data-lv-reveal>
            Say it like you live there.
          </h2>
          <div className="lv-outro__cta">
            <OpenButton label="Open Street Vibe" />
            <p className="lv-fine">Free, in your browser, no download.</p>
          </div>
        </section>
      </main>

      <footer className="lv-footer">
        <span>© {new Date().getFullYear()} Street Vibe</span>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/content-policy">Content Policy</Link>
        <Link href="/app">Open the app</Link>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }}
      />
      <LandingExperience stops={EXPERIENCE_STOPS} />
    </div>
  );
}
