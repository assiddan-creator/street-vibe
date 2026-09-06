import Link from "next/link";
import { PublicShell } from "@/components/marketing/PublicShell";

const ACCENT = "#4ade80";

const BEFORE_AFTER: { lang: string; tourist: string; local: string }[] = [
  {
    lang: "Spanish",
    tourist: "¿Podría usted decirme dónde se encuentra la estación, por favor?",
    local: "oye, sabes por dónde queda la estación?",
  },
  {
    lang: "French",
    tourist: "Je suis très heureux d'avoir fait votre connaissance ce soir.",
    local: "franchement, contente de t'avoir rencontré ce soir",
  },
  {
    lang: "Brazilian Portuguese",
    tourist: "Gostaria muito de poder vê-la novamente em breve.",
    local: "curti demais, bora marcar de novo?",
  },
];

const FEATURES: { title: string; body: string }[] = [
  {
    title: "11 real dialects",
    body: "Not a generic \"casual\" setting. London roadman, Paris banlieue, Cairo, Tel Aviv, Rio, CDMX and more — tuned by a native voice.",
  },
  {
    title: "Hear it out loud",
    body: "An AI voice reads the line back in the accent, so you know how it lands before you hit send.",
  },
  {
    title: "\"Does this sound local?\"",
    body: "Paste what you already wrote. Get a native-ness score, a cleaned-up version, and exactly what gave you away.",
  },
  {
    title: "Dial the intensity",
    body: "From barely-there local colour to full slang. Pick the vibe — DM, flirt, argument, hype — and it matches.",
  },
];

const STEPS: { n: string; title: string; body: string }[] = [
  { n: "1", title: "Type it plain", body: "Write what you mean in your own words, any language." },
  { n: "2", title: "Pick a place & a vibe", body: "Choose the dialect and how strong you want it." },
  { n: "3", title: "Send it like a local", body: "Copy the line, hear it, or check something you wrote yourself." },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Which languages does it cover?",
    a: "Spanish, French, German, Italian, Portuguese, Russian, Japanese, Arabic, Hebrew and English as standard languages, plus 11 street dialects on top of them.",
  },
  {
    q: "Is my text stored?",
    a: "Your recent phrases are kept only in your own browser, for the history panel. The server processes each message to translate it and does not keep a copy. See the Privacy page.",
  },
  {
    q: "How accurate is the slang?",
    a: "Each dialect is shaped by a native-speaker profile rather than a dictionary swap. It is built for everyday chat, not legal or medical text.",
  },
  {
    q: "Can I cancel Pro anytime?",
    a: "Yes. One click in the billing portal. You keep Pro until the end of the period you already paid for.",
  },
];

export default function Landing() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 pb-14 pt-10 text-center sm:pt-16">
        <p
          className="mx-auto mb-4 w-fit rounded-full border px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.18em]"
          style={{ borderColor: `${ACCENT}44`, color: ACCENT }}
        >
          11 dialects · AI voice
        </p>
        <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-white text-balance sm:text-6xl">
          Talk like a local,
          <br />
          not a tourist.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-white/60 sm:text-[18px]">
          Street Vibe rewrites your message the way someone who actually lives there would send it —
          for DMs, dating apps, and group chats in a language that isn&apos;t your first.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/app"
            className="rounded-full px-6 py-3 text-[15px] font-bold text-black transition-transform hover:scale-[1.03]"
            style={{ backgroundColor: ACCENT }}
          >
            Open Street Vibe — it&apos;s free
          </Link>
          <a
            href="#how"
            className="rounded-full border border-white/15 px-6 py-3 text-[15px] font-semibold text-white/80 transition-colors hover:bg-white/5"
          >
            See how it works
          </a>
        </div>
        <p className="mt-3 text-[13px] text-white/40">No sign-up to try · 10 free rewrites a day</p>
      </section>

      {/* Before / after */}
      <section className="border-y border-white/10 bg-white/[0.02] py-12">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-center font-heading text-2xl font-bold text-white">
            The difference people hear
          </h2>
          <div className="mt-8 flex flex-col gap-4">
            {BEFORE_AFTER.map((row) => (
              <div
                key={row.lang}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  {row.lang}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-red-400/70">
                      Tourist
                    </p>
                    <p className="mt-1 text-[15px] leading-snug text-white/50" dir="auto">
                      {row.tourist}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: ACCENT }}
                    >
                      Local
                    </p>
                    <p className="mt-1 text-[15px] leading-snug text-white/90" dir="auto">
                      {row.local}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="font-heading text-lg font-bold text-white">{f.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-white/55">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-white/10 bg-white/[0.02] py-14">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-center font-heading text-2xl font-bold text-white">How it works</h2>
          <div className="mt-9 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <span
                  className="mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[16px] font-bold text-black"
                  style={{ backgroundColor: ACCENT }}
                >
                  {s.n}
                </span>
                <h3 className="mt-3 font-heading text-[16px] font-bold text-white">{s.title}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-white/55">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-3xl px-5 py-14">
        <h2 className="text-center font-heading text-2xl font-bold text-white">Simple pricing</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="font-heading text-lg font-bold text-white">Free</p>
            <p className="mt-1 text-[28px] font-extrabold text-white">
              $0<span className="text-[14px] font-medium text-white/40"> / forever</span>
            </p>
            <ul className="mt-4 flex flex-col gap-2 text-[14px] text-white/60">
              <li>10 rewrites + 5 voice plays a day</li>
              <li>All 11 dialects</li>
              <li>No sign-up to start</li>
            </ul>
          </div>
          <div
            className="rounded-2xl border bg-white/[0.04] p-6"
            style={{ borderColor: `${ACCENT}55` }}
          >
            <p className="font-heading text-lg font-bold text-white">Pro</p>
            <p className="mt-1 text-[28px] font-extrabold text-white">
              $3.99<span className="text-[14px] font-medium text-white/40"> / month</span>
            </p>
            <ul className="mt-4 flex flex-col gap-2 text-[14px] text-white/70">
              <li>Unlimited rewrites and voice</li>
              <li>Unlimited &ldquo;does this sound local?&rdquo; checks</li>
              <li>Cancel anytime</li>
            </ul>
            <Link
              href="/app"
              className="mt-5 block rounded-full px-4 py-2.5 text-center text-[14px] font-bold text-black"
              style={{ backgroundColor: ACCENT }}
            >
              Start free, upgrade in the app
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl px-5 pb-16">
        <h2 className="text-center font-heading text-2xl font-bold text-white">Questions</h2>
        <div className="mt-8 flex flex-col gap-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <summary className="cursor-pointer list-none font-heading text-[15px] font-semibold text-white/90 [&::-webkit-details-marker]:hidden">
                {item.q}
              </summary>
              <p className="mt-2 text-[14px] leading-relaxed text-white/55">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/app"
            className="rounded-full px-6 py-3 text-[15px] font-bold text-black transition-transform hover:scale-[1.03] inline-block"
            style={{ backgroundColor: ACCENT }}
          >
            Try it now
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
