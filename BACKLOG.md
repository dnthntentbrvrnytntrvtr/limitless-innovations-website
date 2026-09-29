# Limitless Innovations website: where things stand

Kept in the repo so any future session can pick up where the last one stopped.
Last updated 29 Sep 2026. "Owner" = only the owner can do it (accounts, keys, decisions).

## Done
**Hosting**
- Live at limitlessinnovations.co.uk on a Cloudflare Worker; every push to `main` publishes itself. Build load-checks every worker module.
- PRIVATE MODE is on (`SITE_LOCKED: "on"` in wrangler.jsonc): whole site behind the desk password, login page shows one of the six building photos, next one each visit. Set to `"off"` to go public.

**Look and content**
- Centred header, 3D stone-block logo, ember/steel palette, building wallpapers with fade, footer on one line in white.
- Projects reordered (partition head first, installs then repairs); Vantage photos; steel coatings with five real stage photos; certification section simplified; work photos watermarked.
- In-site message form, chat nudge, `/#message` opens the form (used by label QR codes).
- SEO basics: title, canonical, schema.org data, sitemap.xml (robots currently blocks everything while private).

**Shop**
- Materials / Tools / Workwear pages, three across, photo zoom; 59 products with real photos except the dry film gauge.
- Prices = cheapest supplier price inc VAT + 20% (worker/build-prices.js), "no VAT to add"; basket totals; orders store the quoted price.

**Order desk** (`/desk`)
- Messages and orders as tiles; order page with customer, quoted prices, cost, margin, supplier links (Screwfix / Toolstation / Amazon / distributors), printable invoice, statuses New to Paid, delete and clear; Suppliers tab with photos; mark-up box (20%).
- Built and tested, waiting for keys: Resend email alerts; Stripe invoice with pay link and automatic Paid (webhook).

**Other**
- Firestop labels: C2 fire, acoustic (dB box), fire & acoustic, A4 sheets (scratchpad labels; sent to owner).
- Research delivered: certifications and costs, VAT position, Stripe onboarding answers, site-audit app competitors, Cloudflare free limits.

## Waiting on the owner (in priority order)
1. [ ] Resend: Secret `RESEND_API_KEY` + Text `ALERT_FROM` = `Limitless website <website@limitlessinnovations.co.uk>`; send a test message.
2. [ ] Check which certifications are in Limitless Innovations Ltd's own name (owner's FIRAS is personal, via another company; FIRAS certifies companies). Then Claude updates the certification section and logo strip. Must be right before going public.
3. [ ] Stripe (paused): restricted key (Customers + Invoices: Write) → `STRIPE_SECRET_KEY`; webhook `https://limitlessinnovations.co.uk/api/stripe/webhook`, event `invoice.paid` → `STRIPE_WEBHOOK_SECRET`; one live test + refund. DESK-SETUP.txt step 3.
4. [ ] Optional `BANK_DETAILS` Text variable (printed invoices only).
5. [ ] Certifications plan: quotes from two third-party schemes for one module (penetration seals; FIRAS needs 2+ employees, 4 contracts); one SSIP at CAS level (CHAS Elite £949/yr or Constructionline Gold); drop SafeContractor at renewal; ISO 9001 / ASFP later.
6. [ ] Distributor trade / reseller account with blind dispatch (Nullifire, Fire Seals Direct); send the discount so desk costs update.
7. [ ] Pick the label to print; set a shop price for labels.
8. [ ] Competitor app screenshots into `Firestopping\New folder\App research`, then start the app project in a new session.
9. [ ] When ready to go public: unlock the site, then Google Search Console (verify via Cloudflare, submit sitemap) and Google Business Profile (service area London) plus 3 to 5 client reviews.
10. [ ] Optional: Cloudflare Access (email code) in front of the desk; `DESK_PATH`.

## Next for Claude (no owner input needed)
- [ ] Dry film thickness gauge (0 to 5 mm, e.g. Elcometer 456) and a branded wet film comb from a specialist: photo, link, price.
- [ ] Privacy notice (the form collects names, emails, phones) and trade terms of sale (payment before ordering, delivery, returns, installed-system disclaimer). Drafts for the owner to check; not legal advice.
- [ ] Invoices for installation work from the desk ("New invoice" for any job), same invoice and Stripe flow.
- [ ] Speed check on phones (Lighthouse) and image slimming.
- [ ] Shop kits (tool and PPE bundles; no fire-rated "system" kits without the tested-system caveat).
- [ ] Once keys are in: live email-alert test, live Stripe test.
- [ ] Sharper steel-coatings stage 5 photo when the owner has one.
- [ ] When VAT registered: prices ex VAT + VAT, invoices and Stripe to match.

## Ideas to offer
- Cloudflare Web Analytics (free, no cookies) once public, to tell real visitors from bots.
- Cloudflare email notification for failed Worker builds.
- ICO data protection fee: check the ICO self-assessment; tier 1 is £52/yr if not exempt.
- Unique QR per seal label linking to that seal's record (ties into the app).

## Decisions log
- Not VAT registered: no VAT charged; supplier VAT is a cost; shop prices say "no VAT to add". Threshold £90k rolling 12 months.
- Mark-up 20% on cheapest supplier price inc VAT; Amazon alternatives (`alt: true`) never set prices.
- Orders are approved by the owner before any payment request; payment before goods are ordered.
- Stripe: Lite fraud protection, no Stripe Tax, descriptor LIMITLESS INNOVATIONS / LIMITLESS.
- Labels: option C2 style (charcoal header, grey hairlines, no orange); acoustic and combined versions.
- Private mode until the certification section is confirmed and legal pages exist.

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
