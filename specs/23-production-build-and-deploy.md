# Spec 23 — Production build & deploy

## Goal

Ship reel. After this spec, the app is built for production with env-var validation, sourcemaps off in prod, console.log stripped, deployed to Vercel (or Netlify) on free tier, with the two Edge Functions (`recommendations`, `intent-search`) deployed via `supabase functions deploy`. Smoke tests against the production URL verify the user-visible loop works.

## Dependencies

- **Specs 01–22** — every feature is in place and tested.
- **Spec 04** — env vars defined in `.env.example`.
- **Specs 17, 19** — Edge Functions ready to deploy.
- **Context invariants**: `architecture.md` §"Hosting" rows; `project-overview.md` §"Cost ceiling" (free tiers only).
- **Agents that gate this spec**: `fsd-architect` (final tree audit), `test-writer` (smoke against prod).

## Design Decisions

- **Hosting (web)**: Vercel free tier as primary; Netlify free tier as a documented backup. Both serve the static Vite output. SPA routing handled by Vercel's `vercel.json` rewrites (`/*` → `/index.html`) — equivalent in `netlify.toml` if Netlify is used.
- **Hosting (functions)**: Supabase Edge Functions are deployed via `pnpx supabase functions deploy <name>` against the linked project. Service-role key + OpenRouter key + TMDB key are set via `pnpx supabase secrets set --env-file .env.functions` (a gitignored env file alongside `.env.local`); `supabase secrets list` confirms.
- **Env validation at build time**: `vite.config.js` is amended so the build fails if any required `VITE_*` var is missing. Implementation: a small `validateEnv()` function reads `process.env`, lists missing vars, throws. Required vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TMDB_API_KEY`. Optional: `VITE_FEATURE_MORE_LIKE_THIS` (spec 13). Missing optional vars warn but don't fail.
- **Production build hardening**:
  - `console.log` calls under `src/` are stripped. Implementation: ESBuild's `drop: ['console']` config in Vite. (Edge Function logs are kept — they go to Supabase log drains.)
  - Sourcemaps off in production (`build.sourcemap: false`). Sourcemaps stay on for the dev/preview build (`build.sourcemap: 'hidden'` for preview if useful for staging triage).
  - Bundle analysis: run `vite build --mode analyze` (custom mode that emits a stats file) once; manual sanity check that no surprise large dep snuck in. Target: total JS gzipped < 250 KB on initial load (Vite's manualChunks already split vendor/firebase — and firebase is gone post-spec-05).
- **CI**: a single GitHub Actions workflow at `.github/workflows/ci.yml` (replaces the netflix-clone's deleted `firebase-deploy.yml`). On push to `main`: runs `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. Optional matrix later; v1 ships a single Node 22 job. No deploy from CI in v1 — deploys are triggered manually.
- **Smoke tests against prod**: a tiny smoke suite at `tests/smoke/` (top-level, not under `src/` since it runs against deployed URL, not the source tree). Uses Playwright (installed only as a devDep used in this spec; not pulled into the main bundle):
  - Open home → wait for first row → assert ≥ 1 tile rendered.
  - Hover a tile → assert trailer overlay mounts.
  - Click a tile → assert `/movie/:id` page loads with player.
  - Sign in with a test account (creds via env) → home re-loads → For You row appears.
  - Type intent prompt → submit → assert at least 1 reasoning line renders.
  - Each step has a 10 s timeout; smoke completes in ≤ 60 s end-to-end.
- **README**: a fresh `README.md` for reel — what it is, who it's for, how to run, attribution (TMDB + Supabase + OpenRouter + originating netflix-clone reference + `vercel-labs/agent-skills` for skills), license note. The `NETFLIX-CLONE-README.md` file was already deleted in the pre-execution cleanup pass; attribution lives here in reel's new README.
- **Domain / branding**: out of scope; reel deploys to the default `*.vercel.app` URL in v1. Custom domain is a v1.1 task.
- **Final cleanup pass**:
  - Delete the dev-only `/_dev/*` routes (token gallery, tile gallery) from production builds — already gated by `import.meta.env.DEV`, but verify.
  - Delete leftover legacy files from netflix-clone (e.g., the Banner / BannerAmbient / MovieModal files if they were left undeleted by spec 13). `fsd-architect` final audit catches these.
  - Verify `grep -ri "netflix" src/` returns 0 in source code (only acceptable in `NETFLIX-CLONE-README.md` and migration comments).

## Implementation

1. Amend `vite.config.js`:
   - Add `validateEnv()` invocation at config-resolution time.
   - Add `define` block to strip dev-only flags.
   - Add `build.sourcemap: false` for production; `esbuild.drop: ['console', 'debugger']` for prod.
   - Verify `manualChunks` no longer references firebase (spec 05).
2. Create `vercel.json` at repo root:
    ```json
    {
      "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
      "buildCommand": "pnpm build",
      "outputDirectory": "dist",
      "framework": null
    }
    ```
   And a documented Netlify fallback (`netlify.toml`).
3. Create `.github/workflows/ci.yml` running typecheck/lint/test/build on push.
4. Author `README.md` for reel (replacing the netflix-clone's). Sections: what it is, run-locally (`pnpm install`, `pnpm dev`, env setup pointer), tech stack summary, deploy notes, license.
5. Add `@playwright/test` as a devDep (the test runner package; `playwright` alone is the browser bindings); create `tests/smoke/reel.spec.ts`. Smoke runs locally via `pnpm test:smoke -- --base-url <url>`. Document in README.
6. Deploy:
   - **Vercel**: import the repo via the Vercel dashboard, set the four env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TMDB_API_KEY`, optional feature flags). First deploy is automatic on the first push to `main` after import.
   - **Supabase Edge Functions**: `pnpx supabase functions deploy recommendations` and `pnpx supabase functions deploy intent-search`. Set `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `TMDB_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in the Supabase function env (dashboard).
7. Run `pnpm test:smoke -- --base-url https://<deployed-url>`. Iterate on any failure.
8. Final `fsd-architect` audit pass on the full tree. Address any reported violations.
9. Final cleanup: delete legacy files identified in audit; verify dev-only routes are not in the production bundle (`grep "_dev" dist/` → 0 hits in JS).
10. Update `context/progress-tracker.md`: mark v1 shipped, log the deployed URL, log the chosen OpenRouter model and Supabase project ref.
11. Run all gates one last time. Commit as `chore: ship v1 (env validation, prod build hardening, vercel + supabase deploy, smoke pass)`.

## Success Criteria

1. `pnpm build` with all required env vars set produces `dist/` with no console.log statements (`grep -r "console.log" dist/` → 0 in JS) and no sourcemaps.
2. `pnpm build` with a required env var missing fails with a clear "missing X" message; build does not proceed.
3. Deployed URL serves the SPA; deep links (e.g. `https://<url>/movie/550`) load correctly via the rewrite.
4. Both Edge Functions return 200 for valid requests against the deployed Supabase project: smoke `curl` for `recommendations` and `intent-search` confirms.
5. CI workflow passes on the latest commit; failing typecheck/lint/test/build blocks merge.
6. Playwright smoke against prod completes in < 60 s and all 5 steps pass.
7. `grep -ri "netflix" src/` returns 0 (the `NETFLIX-CLONE-README.md` file no longer exists; remaining acceptable hits are only in migration comments referring to the source repo).
8. `grep -ri "openrouter" src/` returns 0 (the key never reaches the browser; verified one last time).
9. `grep -r "console\\.log" src/` returns 0 (cleanups during dev shouldn't leave logs).
10. `progress-tracker.md` updated: v1 shipped, deployed URL recorded, chosen model recorded, all open questions either resolved or moved to "v1.1 backlog".
11. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green; `fsd-architect` reports zero violations on the final tree.

## Agents & Skills

**Agents (mandatory invocation):**
- `fsd-architect` — final tree audit at step 8. Pass = zero layer-direction violations, single-Supabase-client invariant intact, single-TMDB-client invariant intact, no OpenRouter reference in `src/`.
- `test-writer` — drives the Playwright smoke spec (step 5). Validates the 5-step end-to-end flow uses behavior-based selectors (no implementation coupling).

**Skills (consulted by the agents during this spec):**
- `.claude/skills/vercel-react-best-practices/rules/bundle-defer-third-party.md` — informs bundle-size targets and the analyze-mode pass.
- `.claude/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md` — final pass to ensure no barrel imports leaked in.

**Notes:**
- v1 model `openai/gpt-oss-20b:free` set in `OPENROUTER_MODEL` Supabase secret.
- No `prompt-engineer` here (no prompt change in this spec).
