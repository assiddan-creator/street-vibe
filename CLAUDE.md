# Street Vibe

Consumer web app that rewrites text into city street dialects (Kingston, London, Brooklyn, Tokyo, Paris, Moscow, CDMX, Rio, Tel Aviv, Cairo, Madrid) with AI voice playback. Owner: Assi — reply to him in Hebrew; code, comments and commits in English.

Start every session by reading `HANDOFF.md`; update it at the end.

## Stack
- Next.js 16 (App Router), React 18, TypeScript, Tailwind. Landing at `/`, the tool at `/app` (`components/TranslatorView.tsx`).
- Auth: Clerk (`@clerk/nextjs` Core 3 — `<SignedIn>`/`<SignedOut>` are removed, use `useAuth()`).
- DB / metering: Supabase (`lib/supabase.ts`, `lib/usage.ts`, `supabase/schema.sql`). Daily caps live in BOTH `DAILY_LIMITS` in `lib/usage.ts` and the `consume_usage` SQL — keep them in sync.
- Billing: Lemon Squeezy buy link + webhook (`lib/lemonSqueezy.ts`, `app/api/billing/*`). Stripe does not support Israel — don't suggest it.
- Rate limiting: Upstash (`lib/rateLimit.ts`), in-memory fallback. All integrations are opt-in on env vars and fail open.
- Text: Gemini (`lib/geminiText.ts`), Replicate fallback. Voice: ElevenLabs `eleven_v4_turbo` per city (`lib/elevenLabsTts.ts`, `lib/elevenLabsVoicePresets.ts`), MiniMax fallback.
- Dialect internal `value` keys (e.g. the old "Tokyo Gyaru" id) are map keys across many files — rename labels, never keys.
- Deploy: Vercel (street-vibe.vercel.app). Visual QA happens on Vercel Preview deployments.

## Commands
- Tests: `npm test` (tsx --test, `tests/*.test.ts`)
- Types: `npx tsc --noEmit`
- Lint: `npm run lint`
- Build check: `rm -rf .next && npx next build`

## Hard rules (enforced by `.claude/hooks/guard.mjs`)
- Never run `npm run dev`, `next dev`, `next start` or any long-lived local server — it froze Assi's machine twice. Verify with tsc + build only.
- Never `git push` to `main`. Work on a branch, push the branch, open a PR, merge through the PR (`gh pr merge` works).
- Never `git add -A` / `git add .` / `git add --all`. Stage explicit paths. Never stage `app/dev/replicate-bakeoff/`, `app/dev/replicate-phrasing-bakeoff/`, `test_audio_samples/1*.mp3`, `tmp/`.
- Never read, print or edit `.env.local`, and never type an API key or secret value anywhere. Env var names are fine; Assi pastes values himself.

## Code style (from `.cursor/rules/`)
- TypeScript throughout, explicit types for public interfaces; small pure utilities in `lib/`, focused components in `components/`.
- Dark-mode-first, high contrast, restrained accents; Tailwind utilities over ad-hoc CSS; motion with restraint and reduced-motion support.

## Ads
Street Vibe ads are a separate track: use the `street-vibe-ad` skill and `AD-METHOD.md`. All on-screen ad text is English.
