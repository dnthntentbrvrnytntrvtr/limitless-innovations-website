# CLAUDE.md

Rules from the owner for every session working in this repo.

## Ask before you act
Stop and ask the owner (multiple choice), and wait for the answer, before:
- pushing or merging to main (main deploys straight to the live app)
- running anything against the production databases (limitless-app, limitless-site) or R2 buckets
- adding a migration, or changing or deleting data
- deleting files, branches or tests, or turning tests off
- changing sign-in, PINs, permissions, payments, orders or anything security-related
- adding a new service, package or anything that costs money
- any change the owner didn't ask for

Deleting needs a yes twice: name exactly what will be deleted and ask; after the yes, ask again ("To confirm: delete X, and nothing else?") and wait for a second yes. Delete nothing beyond what was confirmed.

## How to work
- Before building anything bigger than a small fix, show a short plan: what changes, what could break, how it will be tested. Wait for OK.
- Work on a branch. Run npm test, npm run test:e2e and npm run check before saying it's done, and show the counts.
- Change only what was asked. New ideas go on the backlog.
- If something fails twice, stop and say so rather than trying workarounds.
- At the end, say in plain words what changed, what's live and what isn't.

## This repo
- The company website and its private desk, live at limitlessinnovations.co.uk. A push to main publishes the live site. Open a PR; do not merge. The production database is "limitless-site".
- Checks: this repo has no package.json, so npm test, npm run test:e2e and npm run check don't exist here. Instead run `node --check` on every file in worker/ and chat-assistant/ and say which passed.
- The website stays private: SITE_LOCKED stays "on" in wrangler.jsonc.
- Orders are approved by the owner before any payment request.
- Bank details must never be visible.
- Nothing goes live on the desk without the owner's OK.
- Never commit secrets.
