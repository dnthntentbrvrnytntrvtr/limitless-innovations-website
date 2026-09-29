# Limitless Innovations website: where things stand

Kept in the repo so any future session can pick up where the last one stopped.
Last updated 29 Sep 2026 (late). "Owner" = only the owner can do it (accounts, keys, decisions).

## Done
**Hosting**
- Live at limitlessinnovations.co.uk on a Cloudflare Worker; every push to `main` publishes itself. Build load-checks every worker module.
- PRIVATE MODE is on (`SITE_LOCKED: "on"` in wrangler.jsonc): whole site behind the desk password, login page shows one of the six building photos, next one each visit (counter in the database, no cookie). Set to `"off"` to go public.
- Security headers (CSP, HSTS and the rest) are set by the Worker itself; the `_headers` file only matters on other hosts.
- Hourly clean-up (cron `23 * * * *`, `tidy` in worker/index.js), as the privacy notice promises: rate-limit rows after an hour, IP addresses after 30 days, messages and never-invoiced enquiries after 12 months, visit totals after 25 months. Paid orders are never deleted.
- Database schema documented in `worker/schema.sql`.

**Look and content**
- Centred header, 3D stone-block logo, ember/steel palette, building wallpapers with fade, footer on one line in white with company details and Privacy / Terms of sale links.
- Projects reordered, Vantage photos, steel coatings with five real stage photos, certification section simplified, work photos watermarked.
- In-site message form, chat nudge, `/#message` opens the form (used by label QR codes).
- SEO basics: title, canonical, schema.org data, sitemap.xml (robots blocks everything while private).
- Phones: self-hosted fonts (no Google Fonts), lazy photos, right-sized backdrop, small hero logos. Slow-4G test, iPhone 13: page ready in about 4 s instead of 17 s, 0.74 MB instead of 3.4 MB.

**Legal (drafts written by Claude, not a solicitor)**
- `/privacy` (privacy notice) and `/terms` (trade terms of sale), linked from the footer, the basket (a required tick box; the order stores which version was agreed), the message form, the chat and the invoices.
- Source drafts and the owner decision list: scratchpad `legal/` (privacy-final.md, terms.md, notes.md).

**Shop**
- Materials / Tools / Workwear pages, three across, photo zoom; 63 products with real photos.
- Prices = cheapest supplier price inc VAT + 20% (worker/build-prices.js), "no VAT to add"; basket totals; orders store the quoted price.
- Four kits (Sealant, Batt cutting, Compound mixing, Site PPE), priced as the sum of their parts; the desk lists each part with its suppliers.
- DeFelsko PosiTector 6000 FT1 dry film gauge (0 to 6 mm, DMV UK £720 ex VAT, shop £1,036.80) and TQC Sheen WG II stainless wet film comb (Industrial Physics £69 ex VAT, shop £99.36), with the WG III and a budget comb noted as alternatives.

**Order desk** (`/desk`)
- Messages and orders as tiles; order page with customer, quoted prices, cost, margin, supplier links, printable invoice, statuses New to Paid.
- Job invoices for site work ("New job invoice"): customer, site, lines with decimal quantities, notes; editable until sent through Stripe or paid; same Print / Stripe buttons.
- Special-order tick per shop line (printed on the invoice, trade terms 9.2).
- Paid orders are kept as sales records (can be Closed, not deleted); "Clear" removes only unpaid closed/cancelled ones.
- Visitors tab: daily visits, countries, devices, referring sites, pages. Counted by the Worker, no cookies, no IPs; the owner's own visits and bots excluded.
- Warning banner + email when a website update fails to publish (needs the queue, see owner item 5).
- Built and tested, waiting for keys: Resend email alerts; Stripe invoice with pay link and automatic Paid (webhook).

**Other**
- Firestop labels: C2 fire, acoustic (dB box), fire & acoustic, A4 sheets (scratchpad labels; sent to owner).
- Research delivered: certifications and costs, VAT position, Stripe onboarding answers, site-audit app competitors, Cloudflare free limits, legal requirements.

## Waiting on the owner (in priority order)
1. [ ] Resend: Secret `RESEND_API_KEY` + Text `ALERT_FROM` = `Limitless website <website@limitlessinnovations.co.uk>`; send a test message.
2. [ ] Read `/privacy` and `/terms` and confirm the choices in the legal notes (contract made when the invoice is sent; pay within 7 days; 14-day business returns; special orders; 48 h damage reports; liability capped at the price of the goods; suppliers/couriers listed as recipients).
3. [ ] ICO data protection fee: do the ICO self-assessment; tier 1 is £52 a year (£47 by direct debit).
4. [ ] Ask the insurance broker whether products SOLD (not only installed) are covered, including Building Safety Act s.148 claims.
5. [ ] Failed-update email: create Queue `limitless-builds` + event subscription (Workers Builds, this Worker, build.failed and build.succeeded): DESK-SETUP.txt step 4. Then Claude adds the queue consumer to wrangler.jsonc.
6. [ ] Check which certifications are in Limitless Innovations Ltd's own name (owner's FIRAS is personal, via another company). Then Claude updates the certification section and logo strip. Must be right before going public.
7. [ ] Stripe (paused): restricted key (Customers + Invoices: Write) → `STRIPE_SECRET_KEY`; webhook `https://limitlessinnovations.co.uk/api/stripe/webhook`, event `invoice.paid` → `STRIPE_WEBHOOK_SECRET`; one live test + refund. DESK-SETUP.txt step 3.
8. [ ] Optional `BANK_DETAILS` Text variable (printed invoices only).
9. [ ] Certifications plan: quotes from two third-party schemes for one module (penetration seals); one SSIP at CAS level; drop SafeContractor at renewal; ISO 9001 / ASFP later.
10. [ ] Distributor trade / reseller account with blind dispatch (Nullifire, Fire Seals Direct); send the discount so desk costs update.
11. [ ] Pick the label to print; set a shop price for labels. Decide whether to stock the DFT gauge (cost about £864 inc VAT) or sell it to order.
12. [ ] Competitor app screenshots into `Firestopping\New folder\App research`, then start the app project in a new session.
13. [ ] When ready to go public: unlock the site, then Google Search Console (verify via Cloudflare, submit sitemap) and Google Business Profile (service area London) plus 3 to 5 client reviews.
14. [ ] Optional: Cloudflare Access (email code) in front of the desk; `DESK_PATH`.

## Next for Claude (no owner input needed)
- [ ] When the queue exists: add `"queues": { "consumers": [{ "queue": "limitless-builds", "max_retries": 2 }] }` to wrangler.jsonc (the `queue()` handler is already in worker/index.js).
- [ ] Once keys are in: live email-alert test, live Stripe test (shop order and job invoice).
- [ ] Sharper steel-coatings stage 5 photo when the owner has one.
- [ ] When VAT registered: prices ex VAT + VAT, invoices and Stripe to match.
- [ ] Yearly: review /privacy and /terms, update the "Last updated" date.

## Ideas to offer
- Unique QR per seal label linking to that seal's record (ties into the app).
- A small kit discount (for example 5% off the parts) if kits should sell harder.
- Due date choice on job invoices (7, 14 or 30 days) if main contractors ask for longer terms.

## Decisions log
- Not VAT registered: no VAT charged; supplier VAT is a cost; shop prices say "no VAT to add". Threshold £90k rolling 12 months.
- Mark-up 20% on cheapest supplier price inc VAT; Amazon and other alternatives (`alt: true`) never set prices. Kits = sum of their parts.
- Orders are approved by the owner before any payment request; payment before goods are ordered.
- Stripe: Lite fraud protection, no Stripe Tax, descriptor LIMITLESS INNOVATIONS / LIMITLESS. Invoices due in 7 days.
- Labels: option C2 style (charcoal header, grey hairlines, no orange); acoustic and combined versions.
- Private mode until the certification section is confirmed.
- Visitor numbers: own cookie-free counter instead of Cloudflare Web Analytics (UK visitors, consent rules, CSP).
- No phone numbers anywhere for now.

## Separate project (not this site)
### Firestopping site-audit app: decisions (29 Sep 2026)
- Version 1: **web app first** (installable to phone home screen, offline, camera); native iOS/Android later from the same code.
- Users: **own team first**; selling to other firms later.
- Must-haves: pins on PDF drawings with camera **and gallery** photos (several per pin, reorderable) and seal details per pin; **offline** with sync; branded **PDF handover reports** (O&M / Golden Thread); **QR labels** that open the seal's record.
- Competitor screenshots: owner will put them in `Firestopping\New folder\App research` on his PC.
- Benchmarks: Site Audit Pro (cheap, no drawing pins, gallery/photo-order complaints), Bolster Systems (pins + QR, but per-drawing credits that go read-only after a year, admin-only edits), BORIS (Live Drawing pins, £3k setup per Capterra, slow/crashes). Also Onetrace, FireArrest, PlanRadar, Fieldwire, Snagmaster.
- Our edge: no per-drawing or time-based hosting charges; gallery + camera photos; role-based pin editing for workers, not only admins; same features on phone and PC; speed; ties to our own QR labels.
- Hosting plan: Cloudflare (Workers + D1 for records, R2 for photos/drawings; free tier about 10 GB photos). App stores later: Apple about £80/yr, Google about £20 once.
- Start in its **own GitHub repo and a new session**.
