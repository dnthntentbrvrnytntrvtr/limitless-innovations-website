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
### Firestopping site-audit app — decisions (29 Sep 2026)
- Version 1: **web app first** (installable to phone home screen, offline, camera); native iOS/Android later from the same code.
- Users: **own team first**; selling to other firms later.
- Must-haves: pins on PDF drawings with camera **and gallery** photos (several per pin, reorderable) and seal details per pin; **offline** with sync; branded **PDF handover reports** (O&M / Golden Thread); **QR labels** that open the seal's record.
- Competitor screenshots: owner will put them in `Firestopping\New folder\App research` on his PC.
- Benchmarks: Site Audit Pro (cheap, no drawing pins, gallery/photo-order complaints), Bolster Systems (pins + QR, but per-drawing credits that go read-only after a year, admin-only edits), BORIS (Live Drawing pins, £3k setup per Capterra, slow/crashes). Also Onetrace, FireArrest, PlanRadar, Fieldwire, Snagmaster.
- Our edge: no per-drawing or time-based hosting charges; gallery + camera photos; role-based pin editing for workers, not only admins; same features on phone and PC; speed; ties to our own QR labels.
- Hosting plan: Cloudflare (Workers + D1 for records, R2 for photos/drawings; free tier ≈10 GB photos). App stores later: Apple ~£80/yr, Google ~£20 once.
- Start in its **own GitHub repo and a new session**.
