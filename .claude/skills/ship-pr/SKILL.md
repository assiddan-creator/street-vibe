---
name: ship-pr
description: Ship the current Street Vibe change as a pull request — branch, verify (tests, types, build), stage explicit files, commit, push the branch, open the PR. Use when Assi says ship it, open a PR, or commit and push.
disable-model-invocation: true
---

# Ship a PR (Street Vibe)

Follow the hard rules in `CLAUDE.md`. The guard hook blocks the forbidden commands anyway; don't try to work around it.

## 1. Branch
- `git status --short` and `git branch --show-current`.
- On `main`: create a branch named for the change (`feat/…`, `fix/…`, `chore/…`). Never commit to `main`.

## 2. Verify
Run in this order and stop on the first failure (show the output, fix, rerun):
1. `npm test`
2. `npx tsc --noEmit`
3. `npm run lint`
4. `rm -rf .next && npx next build`

Never start a local server to check the UI — visual QA happens on the Vercel Preview deployment of the PR.

## 3. Stage
- Stage only the files this change touched, by explicit path.
- Never stage: `tmp/`, `app/dev/`, `scripts/` experiments, `test_audio_samples/`, `HANDOFF.md`, `.env*`, `graphify-out/`, or files from other unfinished work. When unsure whether a file belongs, ask Assi.
- `git diff --cached --stat` and check the list before committing.

## 4. Commit and push
- Commit message in English: `type(scope): summary`, then a short body on the why. End with the attribution line the session gives.
- `git push -u origin <branch>` (the branch, never `main`).

## 5. Pull request
- `gh pr create --base main` with a title like the commit and a body: what changed, why, how it was verified, anything Assi must do (env vars, Supabase SQL, Lemon Squeezy dashboard).
- Don't merge unless Assi asked. When he does: `gh pr merge <n> --squash` (or `--merge` if he prefers), then `git checkout main && git pull`.

## 6. Report
Tell Assi in Hebrew: the PR link, what was verified, and what's left for him.
