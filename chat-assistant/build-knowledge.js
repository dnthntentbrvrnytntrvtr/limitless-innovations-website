#!/usr/bin/env node
/* Builds the chat assistant's knowledge from the website and writes it into worker.js.

   Usage:   node build-knowledge.js [path/to/index.html] [path/to/worker.js]
   Default: ../index.html (the site, one folder up) and worker.js next to this script.

   Re-run it whenever the site's content changes, then paste the new worker.js
   into the Cloudflare dashboard (Workers & Pages → your Worker → Edit code → Deploy). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const indexPath = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
const workerPath = path.resolve(process.argv[3] || path.join(__dirname, 'worker.js'));
const html = fs.readFileSync(indexPath, 'utf8');

/* ---- 1. The SITE object: run the <script> block that defines it, in a sandbox ---- */
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const siteScript = scripts.find(s => /\bconst\s+SITE\s*=/.test(s));
if (!siteScript) fail('Could not find "const SITE = {...}" in ' + indexPath);
let SITE;
try { SITE = vm.runInNewContext(siteScript + '\n;SITE', {}, { timeout: 2000 }); }
catch (e) { fail('The SITE block has an error: ' + e.message); }

/* ---- 2. Fixed page text (hero, about, section intros) ---- */
const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&copy;/g, '(c)').replace(/&[a-z]+;/g, ' ');
const text = s => decode(String(s || '')
  .replace(/<(script|style|svg|dialog|form)\b[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<\/(p|h[1-6]|li|div|header|section)>/gi, '\n')
  .replace(/<[^>]+>/g, ' '))
  .split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
const section = id => {
  const m = html.match(new RegExp(`<(section|header)\\b[^>]*id="${id}"[^>]*>([\\s\\S]*?)</\\1>`, 'i'));
  return m ? text(m[2]).map(l => l.replace(/^\d{2} /, '')).filter(l => !/^\d{2}$|^Trade basket \d*$/.test(l)) : [];
};
const meta = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1] || '';
const cartText = (html.match(/<dialog[^>]*id="tradeCart"[^>]*>([\s\S]*?)<\/dialog>/i) || [])[1] || '';
const cartLines = text(cartText.replace(/<form[\s\S]*?<\/form>/i, '')).filter(l => l.length > 30);
const cartButton = (cartText.match(/<button[^>]*type="submit"[^>]*>([^<]+)</i) || [])[1] || 'Prepare trade order email';

/* ---- 3. Assemble the knowledge text ---- */
const real = v => v != null && String(v).trim() !== '' && !/^\s*\[[^\]]*\]\s*$/.test(String(v));  // skip "[placeholders]"
const mats = list => (list || []).map(([what, prod]) => real(prod) ? `${what} (${prod})` : what).join('; ');
const out = [];
const h = t => out.push('', '## ' + t);
const line = s => out.push(s);

h('Company');
line('Limitless Innovations Ltd, a passive fire protection contractor working across London.');
if (meta) line('Website summary: ' + meta);
line('Email: ' + SITE.email + ' (the contact route shown on the website).');
line(real(SITE.phone) ? 'Phone: ' + SITE.phone : 'Phone: no phone number is published on the website. Ask people to email.');
if (real(SITE.registeredIn)) line('Registered in ' + SITE.registeredIn + '.');
if (real(SITE.address)) line('Registered office: ' + SITE.address);
if (real(SITE.companyNumber)) line('Company number: ' + SITE.companyNumber);

h('Page text: hero and about (#about)');
section('top').forEach(line);
section('about').forEach(line);

h('How to get a quote (#contact)');
section('contact').filter(l => !/^(Copy email|Email us)$/.test(l)).forEach(line);
line('Quotes: the quickest route is the "Message us" form on the website (name, email, phone and what needs protecting; it goes straight to the team), reachable from the Get a quote button, the strip after Projects, the assistant bubble and the Contact section, linked as [message form](#message). Drawings, photos or a site address can also go by email to ' + SITE.email + '; the team arranges a survey and replies with a quote.');

h('Certifications (#certification)');
section('certification').filter(l => !/^(Hover|Tap|Ask for our)/.test(l)).forEach(line);
(SITE.accreditations || []).filter(a => a.status !== 'hide')
  .forEach(a => line(`- ${a.name} (${a.body}): ${a.about} ${a.website || ''}`.trim()));

h('Clients (#clients)');
line('Main contractors, specialist contractors and fit-out companies worked with: ' + (SITE.clients || []).map(c => c.name).join(', ') + '.');

h("Buildings worked on (#sites)");
line('The website lists these London buildings the installers have worked on. It does not say what work was done at each.');
(SITE.sites || []).forEach(s => line(`- ${s.name} (${s.area}): ${s.about}`));

h('Before and after projects (#projects)');
(SITE.projects || []).forEach(p => line(`- ${p.number}, ${p.type}, ${p.date}: ${p.title}. ${p.summary} Materials: ${mats(p.materials)}.`));

h('Gallery jobs (#gallery)');
(SITE.gallery || []).forEach(j => line(`- ${j.title} (${j.date}): ${j.summary} Photos: ${(j.photos || []).map(p => p.text).join(' ')}`));

h('Typical seal details: "How a seal is built" (#details)');
line('Typical examples drawn to scale. Each real opening must follow the manufacturer\'s tested system for that wall or floor, service and rating.');
(SITE.details || []).forEach(d => {
  line(`- ${d.title} (${d.size}): ${d.summary}`);
  line(`  Facts: ${(d.facts || []).map(([k, v]) => `${k}: ${v}`).join('; ')}.`);
  line(`  Layers: ${(d.hotspots || []).map(x => `${x.title} [${x.tag}]: ${x.text}`).join(' ')}`);
});

h('Trade products (#products)');
section('products').forEach(line);
line('Fire ratings below are product-level examples from the manufacturers; the tested system decides the actual rating.');
(SITE.products || []).forEach(p => line(`- ${p.brand} ${p.name}: ${p.what} Uses: ${p.uses}. Fire: ${p.fire}. Size: ${p.size}. Manufacturer page: ${p.link}`));

h('How to order trade products');
line(`Open Products, choose a product and quantity, press "Add to basket", then open the "Trade basket", enter company name, contact name, work email (and optionally phone, VAT number, delivery postcode and notes) and press "${cartButton.trim()}". This opens an email to ${SITE.email} with the order enquiry.`);
cartLines.forEach(line);
line('No online payment. Trade prices, stock, availability and delivery are confirmed by the team in reply to each enquiry. The basket is saved in the visitor\'s own browser only.');

h('Intumescent coating to structural steel (#coatings)');
section('coatings').forEach(line);
(SITE.coating || []).forEach(([t, p], i) => line(`${i + 1}. ${t}: ${p}`));

h('Website sections');
line('#about What we do · #projects Before and after · #gallery From site · #sites Buildings we\'ve protected · #details How a seal is built · #products Materials for trade · #coatings Steel coatings · #clients Who we work for · #certification Certified work · #contact Contact and quotes');

const knowledge = out.join('\n').trim();

/* ---- 4. Write it into worker.js between the markers ---- */
const worker = fs.readFileSync(workerPath, 'utf8');
const START = /\/\/ ---- KNOWLEDGE:START[^\n]*\n/;
const END = /\/\/ ---- KNOWLEDGE:END ----/;
const s = worker.search(START), e = worker.search(END);
if (s < 0 || e < 0 || e < s) fail('Could not find the KNOWLEDGE:START / KNOWLEDGE:END markers in ' + workerPath);
const startLine = worker.slice(s).match(START)[0];
const literal = '`' + knowledge.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
const updated = worker.slice(0, s) + startLine + 'const KNOWLEDGE = ' + literal + ';\n' + worker.slice(e);
fs.writeFileSync(workerPath, updated);

const words = knowledge.split(/\s+/).length;
console.log(`Knowledge written to ${workerPath}`);
console.log(`${knowledge.length} characters, about ${Math.round(knowledge.length / 4)} tokens (${words} words).`);

function fail(msg) { console.error('build-knowledge: ' + msg); process.exit(1); }
