-- The website's database (Cloudflare D1 "limitless-site"), as it stands on 29 Sep 2026.
-- Only needed to rebuild the database from scratch; the live one already has all of this.
-- Rebuild: npx wrangler d1 execute limitless-site --remote --file worker/schema.sql

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  page TEXT,
  source TEXT,
  ip TEXT,                                   -- cleared after 30 days (hourly tidy in worker/index.js)
  status TEXT NOT NULL DEFAULT 'new',        -- new, read, replied, archived
  notified INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,                  -- LI-YYMMDD-XXX
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  company TEXT NOT NULL,
  contact TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  vat TEXT,
  postcode TEXT,
  notes TEXT,
  ip TEXT,                                   -- cleared after 30 days
  status TEXT NOT NULL DEFAULT 'new',        -- new, confirmed, invoiced, paid, ordered, dispatched, closed, cancelled
  notified INTEGER NOT NULL DEFAULT 0,
  stripe_invoice_id TEXT,
  invoice_url TEXT,
  paid_at TEXT,                              -- set once money is received; paid orders are never deleted
  kind TEXT DEFAULT 'shop',                  -- 'shop' (from the basket) or 'job' (installation invoice made on the desk)
  site TEXT,                                 -- job invoices: where the work was done
  terms TEXT                                 -- shop orders: date of the trade terms the customer agreed to
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL,                  -- shop product id, or 'job' for a line of work
  brand TEXT,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL,                      -- job lines may hold decimals (2.5 hours, 12.5 m2)
  status TEXT NOT NULL DEFAULT 'new',        -- new, ordered, received, dispatched
  size TEXT,
  price REAL,                                -- quoted price per unit, in pounds
  special INTEGER DEFAULT 0                  -- 1 = special order: not returnable unless faulty
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  supplier TEXT NOT NULL,
  url TEXT NOT NULL,
  price_pence INTEGER,
  price_note TEXT,
  checked_at TEXT
);

CREATE TABLE IF NOT EXISTS rate (            -- form and login limits (5 an hour); rows kept about an hour
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS kv (              -- small counters, e.g. which photo the private-preview page shows next
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS visits (          -- daily visit totals: no cookies, no IP addresses; kept 25 months
  day TEXT NOT NULL,
  page TEXT NOT NULL,
  country TEXT NOT NULL,
  device TEXT NOT NULL,                      -- phone, tablet, computer
  ref TEXT NOT NULL,                         -- referring site, or 'direct'
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, page, country, device, ref)
);

CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_product ON suppliers(product_id);
