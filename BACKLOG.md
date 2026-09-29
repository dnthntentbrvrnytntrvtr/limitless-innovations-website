# Backlog — Limitless Innovations website

Kept in the repo so any future session can pick up where the last one stopped.
Owner-side = things only the owner can do (accounts, keys, decisions).

## Owner-side
- [ ] Resend: add Secret `RESEND_API_KEY` and Text `ALERT_FROM` = `Limitless website <website@limitlessinnovations.co.uk>` in the Worker's Variables and Secrets; send a test message.
- [ ] Stripe (paused by owner): restricted key → `STRIPE_SECRET_KEY`; webhook `https://limitlessinnovations.co.uk/api/stripe/webhook` (event `invoice.paid`) → `STRIPE_WEBHOOK_SECRET`; one live test order + refund. See DESK-SETUP.txt step 3.
- [ ] Optional `BANK_DETAILS` Text variable for printed invoices.
- [ ] Google Search Console: add domain (verify via Cloudflare), submit sitemap.xml.
- [ ] Google Business Profile: service-area business (London), ask 3–5 clients for reviews.
- [ ] Nullifire / distributor (e.g. Fire Seals Direct): reseller or trade account, blind dispatch; send discount so desk costs can be updated.
- [ ] Pick which label to print (C2 fire / acoustic / fire & acoustic); decide a shop price for labels.
- [ ] Optional: Cloudflare Access (email code) in front of the desk; `DESK_PATH`.

## Build-side (Claude)
- [ ] Live Stripe test once keys are in; watch order → invoiced → paid.
- [ ] Email-alert test once Resend key is in.
- [ ] Dry film thickness gauge from a specialist (Elcometer 456 / PosiTector 6000): photo, link, price.
- [ ] Sharper photo for steel-coatings stage 5 when the owner has one.
- [ ] Shop kits (e.g. "60-minute riser seal kit").
- [ ] When VAT registered: show prices ex VAT + VAT, update invoices and Stripe.

## Separate project (not this site)
- Firestopping site-audit app (iOS/Android), benchmarked against Site Audit Pro, Bolster Systems and BORIS. Research notes: see chat 29 Sep 2026. Start in its own repo and session.
