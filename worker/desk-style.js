/* The desk's look: Desk 2.0 tokens (from design-reference/tokens.css) and the stylesheet used by the
   login page and the desk. Neutral near-black surfaces, off-white primary buttons, and the five
   priority colours only for pills, dots, bars and labels. No orange or terracotta anywhere.

   Fonts are served by this site (/fonts), because the page's security policy allows no outside font host.
   The font names live in two variables (--font-ui, --font-num) so they can be swapped in one place. */

export const FONT_FACES = `
  @font-face { font-family: "Source Serif 4"; src: url("/fonts/source-serif-4-latin-400.woff2") format("woff2"); font-weight: 400; font-style: normal; font-display: swap; }
  @font-face { font-family: "Source Serif 4"; src: url("/fonts/source-serif-4-latin-500.woff2") format("woff2"); font-weight: 500; font-style: normal; font-display: swap; }
  @font-face { font-family: "Source Serif 4"; src: url("/fonts/source-serif-4-latin-600.woff2") format("woff2"); font-weight: 600; font-style: normal; font-display: swap; }
  @font-face { font-family: "IBM Plex Mono"; src: url("/fonts/ibm-plex-mono-latin-400.woff2") format("woff2"); font-weight: 400; font-style: normal; font-display: swap; }
  @font-face { font-family: "IBM Plex Mono"; src: url("/fonts/ibm-plex-mono-latin-500.woff2") format("woff2"); font-weight: 500; font-style: normal; font-display: swap; }
`;

export const TOKENS = `
  :root {
    color-scheme: dark;
    /* Fonts: UI text, and numbers / refs / countdowns */
    --font-ui: 'Source Serif 4', Georgia, serif;
    --font-num: 'IBM Plex Mono', ui-monospace, monospace;
    /* Neutral near-black surfaces (no colour tint) */
    --bg-page: #0F0F10; --bg-sidebar: #0A0A0B; --bg-panel: #161617; --bg-card: #18181A; --bg-raised: #1F1F21;
    --bg-active: #232326; --bg-chip-on: #303033; --border: #2C2C2F; --border-strong: #353538;
    /* Text: kept bright; nothing dimmer than --text-faint */
    --text: #F5F5F3; --text-2: #D4D4D4; --text-3: #C2C2C2; --text-faint: #A8A8A8;
    /* Primary button */
    --btn-bg: #F5F5F3; --btn-text: #111111;
    /* Status colours: pills, dots, bars and labels only, never page backgrounds */
    --urgent: #E8344F; --urgent-fill: linear-gradient(180deg, #B8173A, #7E0E25);
    --soon: #F2C14E; --planned: #4A78C8; --waiting: #8A9A92; --done: #4E9A62;
    /* Layout */
    --radius-card: 12px; --radius-ctl: 8px; --sidebar-w: 232px; --photo-band-today: 170px; --photo-band-other: 110px;
  }
`;

export const STYLE = FONT_FACES + TOKENS + `
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg-page); color: var(--text); font: 400 15px/1.5 var(--font-ui); -webkit-font-smoothing: antialiased; }
  a { color: #8DB4F2; } a:hover { color: #B7CFF7; }
  h1, h2, h3, h4 { margin: 0; font-family: var(--font-ui); font-weight: 500; }
  [hidden] { display: none !important; }
  .sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  button, input, select, textarea { font-family: inherit; }
  .num { font-family: var(--font-num); }

  /* Buttons: primary is off-white with near-black text; the rest are outlined */
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; border: 1px solid var(--border-strong); border-radius: var(--radius-ctl); background: transparent; color: var(--text); font: 500 13px/1 var(--font-ui); cursor: pointer; text-decoration: none; }
  .btn:hover { background: var(--bg-raised); color: var(--text); }
  .btn.acc { background: var(--btn-bg); border-color: var(--btn-bg); color: var(--btn-text); }
  .btn.acc:hover { background: #fff; color: var(--btn-text); }
  .btn.urgent { background: var(--urgent-fill); border-color: transparent; color: #fff; }
  .btn.sm { padding: 7px 10px; font-size: 12.5px; }
  .btn.danger { color: var(--urgent); }
  .btn.danger:hover { border-color: var(--urgent); background: transparent; }
  .btn[disabled] { opacity: .45; cursor: default; }
  .btn[hidden] { display: none; }
  :focus-visible { outline: 2px solid #8DB4F2; outline-offset: 2px; }

  /* Priority colours (SPEC 3): one set of classes for pills, dots and bars. Always shown with words. */
  .pri-urgent, .tb-urgent { --c: var(--urgent); --bg: rgba(232, 52, 79, .12); --bd: rgba(232, 52, 79, .33); }
  .pri-soon, .tb-soon { --c: var(--soon); --bg: rgba(242, 193, 78, .12); --bd: rgba(242, 193, 78, .33); }
  .pri-planned, .tb-planned { --c: var(--planned); --bg: rgba(74, 120, 200, .12); --bd: rgba(74, 120, 200, .33); }
  .pri-waiting, .tb-waiting { --c: var(--waiting); --bg: rgba(138, 154, 146, .12); --bd: rgba(138, 154, 146, .33); }
  .pri-done, .tb-done { --c: var(--done); --bg: rgba(78, 154, 98, .12); --bd: rgba(78, 154, 98, .33); }
  @supports (background: color-mix(in srgb, red 10%, transparent)) {
    .pri-urgent, .pri-soon, .pri-planned, .pri-waiting, .pri-done { --bg: color-mix(in srgb, var(--c) 12%, transparent); --bd: color-mix(in srgb, var(--c) 33%, transparent); }
  }
  .pri { display: inline-flex; align-items: center; gap: 7px; width: fit-content; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; line-height: 1.3; white-space: nowrap; color: var(--c); background: var(--bg); border: 1px solid var(--bd); }
  .pri-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--c); flex: none; }
  .pri-dot-wrap { display: inline-flex; align-items: center; }
  /* Time bar (SPEC 6) */
  .tb { display: grid; gap: 4px; min-width: 110px; }
  .tb-track { height: 6px; border-radius: 3px; background: var(--border); overflow: hidden; }
  .tb-track i { display: block; height: 100%; border-radius: 3px; background: var(--c); }
  .tb-label { font: 400 11.5px/1.3 var(--font-num); color: var(--c); }

  /* Status labels on messages and orders (not priorities): neutral, with "new" and "paid" borrowing two status colours */
  .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11.5px; line-height: 1.4; background: var(--bg-raised); border: 1px solid var(--border); color: var(--text-2); white-space: nowrap; }
  .pill.new { color: var(--soon); background: rgba(242, 193, 78, .12); border-color: rgba(242, 193, 78, .33); }
  .pill.paid { color: var(--done); background: rgba(78, 154, 98, .12); border-color: rgba(78, 154, 98, .33); }
  .pill.job { background: transparent; border-color: var(--border-strong); }
  @supports (background: color-mix(in srgb, red 10%, transparent)) {
    .pill.new { background: color-mix(in srgb, var(--soon) 12%, transparent); border-color: color-mix(in srgb, var(--soon) 33%, transparent); }
    .pill.paid { background: color-mix(in srgb, var(--done) 12%, transparent); border-color: color-mix(in srgb, var(--done) 33%, transparent); }
  }

  /* Page frame: sidebar + main */
  .app { display: flex; min-height: 100vh; }
  .side { width: var(--sidebar-w); flex: none; position: sticky; top: 0; height: 100vh; overflow-y: auto; display: flex; flex-direction: column; gap: 22px; padding: 20px 14px; background: var(--bg-sidebar); border-right: 1px solid var(--border); z-index: 30; }
  .side .brand { display: flex; align-items: center; gap: 10px; padding: 0 8px; }
  .side .brand .logo { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 7px; background: #26262A; font-weight: 600; font-size: 13px; color: #E8E8E8; }
  .side .brand b { display: block; font-weight: 600; line-height: 1.2; } .side .brand small { display: block; font-size: 11px; color: var(--text-3); }
  .side .grp { display: grid; gap: 2px; }
  .side .grp h2 { padding: 0 10px 6px; font: 400 11px/1.2 var(--font-ui); letter-spacing: .08em; text-transform: uppercase; color: var(--text-faint); }
  .nav { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 10px; border-radius: var(--radius-ctl); color: #DCDCDC; text-decoration: none; font-size: 14px; }
  .nav:hover { background: var(--bg-raised); color: #fff; }
  .nav[aria-current="page"] { background: var(--bg-active); color: #fff; font-weight: 500; }
  .nav .cnt { margin-left: auto; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; background: #2A2A2D; color: var(--text-2); font: 500 11px/1 var(--font-num); }
  .nav .cnt.urgent { background: var(--urgent-fill); color: #fff; }
  .nav .cnt[hidden] { display: none; }
  .side .foot { margin-top: auto; padding: 10px; border-radius: var(--radius-ctl); background: #141416; font-size: 12px; line-height: 1.5; color: var(--text-3); }
  .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .top { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 28px; background: rgba(15, 15, 16, .94); border-bottom: 1px solid var(--border); backdrop-filter: blur(10px); }
  .top .right { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; font-size: 13px; color: var(--text-3); }
  .menu-btn { display: none; white-space: nowrap; }
  .scrim { display: none; }
  .wrap { width: 100%; max-width: 1240px; margin: 0 auto; padding: 24px 28px 40px; }

  /* Photo header band: random project photo per page load, darkened left to right so the title stays readable */
  .band { position: relative; height: var(--photo-band-other); margin-bottom: 18px; border-radius: var(--radius-card); overflow: hidden; border: 1px solid var(--border); background: linear-gradient(100deg, #1F1F21 0%, #131314 60%, #0F0F10 100%); }
  .band.today { height: var(--photo-band-today); }
  .band img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .band .shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8, 8, 9, .9) 0%, rgba(8, 8, 9, .55) 50%, rgba(8, 8, 9, .15) 100%); }
  .band .txt { position: absolute; inset: 0; padding: 18px 24px; display: flex; flex-direction: column; justify-content: space-between; }
  .band.today .txt { padding: 22px 26px; }
  .band h1 { font-size: 28px; line-height: 1.15; } .band.today h1 { font-size: 30px; }
  .band .ttl { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 14px; }
  .band .ttl span { color: #DCDCDC; font-size: 14px; }
  .band .credit { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
  .band .credit b { font-weight: 400; font-size: 13px; color: #E6E6E6; } .band .credit span { font-size: 12px; color: var(--text-3); }

  .tabs { display: none; }
  .filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; font-size: 13px; color: var(--text-3); }
  .filters[hidden] { display: none; }
  .filters label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
  .filters .spacer { flex: 1; }
  .filters input[type="search"] { flex: 1 1 220px; min-width: 160px; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius-ctl); background: var(--bg-panel); color: var(--text); font: 400 14px/1.3 var(--font-ui); }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--text-2); font: 400 13px/1 var(--font-ui); cursor: pointer; }
  .chip .n { opacity: .75; font-family: var(--font-num); font-size: 11.5px; }
  .chip[aria-pressed="true"] { background: var(--bg-chip-on); color: #fff; border-color: #45454A; }
  .chip .pri-dot { width: 7px; height: 7px; }
  table.items td .size { font-size: 12.5px; color: var(--text-3); }
  table.items td.pic { width: 56px; padding-right: 0; }
  .thumb { display: block; width: 48px; height: 48px; object-fit: contain; padding: 3px; border-radius: 4px; background: #f3f4f6; border: 1px solid var(--border); cursor: zoom-in; }
  .thumb:hover { outline: 2px solid var(--border-strong); }
  .cost { display: grid; gap: 2px; margin-top: 6px; font-size: 12.5px; color: var(--text-2); }
  .cost b { color: var(--text); font-weight: 600; } .cost .sell { color: var(--done); font-weight: 600; } .cost .from { color: var(--text-faint); }
  .markup[hidden] { display: none; }
  .markup { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-3); white-space: nowrap; }
  .markup input { width: 58px; padding: 7px 8px; border: 1px solid var(--border); border-radius: var(--radius-ctl); background: var(--bg-panel); color: var(--text); font: 500 14px/1 var(--font-num); text-align: center; }
  .totals { display: flex; flex-wrap: wrap; gap: 6px 18px; padding: 8px 10px; border-radius: var(--radius-ctl); background: var(--bg-page); border: 1px solid var(--border); font-size: 13px; color: var(--text-2); }
  .totals b { color: var(--text); } .totals .sell { color: var(--done); font-weight: 600; }
  .zoom { border: 0; padding: 0; background: transparent; max-width: min(92vw, 560px); }
  .zoom::backdrop { background: rgba(5, 5, 6, .82); }
  .zoom figure { margin: 0; border-radius: var(--radius-ctl); overflow: hidden; background: #f3f4f6; }
  .zoom img { display: block; width: 100%; max-height: 70vh; object-fit: contain; padding: 20px; }
  .zoom figcaption { padding: 12px 16px; background: var(--bg-panel); color: var(--text); font-weight: 600; }
  table.items td a.mf { display: inline-block; margin-top: 3px; font-size: 12px; }
  .card .actions .del { margin-left: auto; }
  .list { display: grid; gap: 12px; }
  .card { padding: 16px 18px; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--bg-panel); display: grid; gap: 10px; }
  table.items { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  table.items th, table.items td { text-align: left; padding: 8px; border-bottom: 1px solid var(--border); vertical-align: top; }
  table.items th { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--text-faint); font-weight: 400; }
  table.items td.qty { font-weight: 600; white-space: nowrap; font-family: var(--font-num); }
  .sup { display: flex; flex-wrap: wrap; gap: 6px; }
  .sup a { display: inline-flex; gap: 6px; padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 12px; text-decoration: none; color: var(--text-2); }
  .sup a b { color: var(--text); font-weight: 600; }
  .sup a:hover { border-color: var(--border-strong); color: #fff; background: var(--bg-raised); }
  .sup .none { font-size: 12px; color: var(--text-faint); }
  .sup .kp { flex-basis: 100%; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding-top: 4px; }
  .sup .kp + .kp { border-top: 1px dashed var(--border); padding-top: 6px; }
  .sup .kp-n { flex-basis: 100%; font-size: 12.5px; color: var(--text-2); }
  .empty { padding: 40px; text-align: center; color: var(--text-3); border: 1px dashed var(--border-strong); border-radius: var(--radius-card); }
  .note { margin-top: 20px; padding: 12px 14px; border-radius: var(--radius-ctl); background: var(--bg-panel); border: 1px solid var(--border); font-size: 13px; color: var(--text-3); }
  .note b { color: var(--text); font-weight: 600; }
  .note.warn { margin: 0 0 14px; border-color: rgba(232, 52, 79, .5); color: var(--text-2); }
  .note.warn b { color: var(--urgent); }
  .note[hidden] { display: none; }

  /* Gallery: everything is a tile you click to open, so the lists stay short. */
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 12px; }
  .tile { position: relative; display: grid; gap: 8px; align-content: start; padding: 14px 16px; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--bg-card); cursor: pointer; text-align: left; color: inherit; font: inherit; transition: border-color .15s ease, background .15s ease; }
  .tile:hover { border-color: var(--border-strong); background: var(--bg-raised); }
  .tile.new { border-left: 3px solid var(--soon); }
  .tile .t-top { display: flex; align-items: baseline; gap: 8px; }
  .tile h3 { font-size: 15.5px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tile .when { margin-left: auto; flex: none; font-size: 12px; color: var(--text-3); }
  .tile .excerpt { font-size: 13.5px; color: var(--text-2); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .tile .t-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12.5px; color: var(--text-3); align-items: center; }
  .tile .thumbs { display: flex; gap: 4px; } .tile .thumbs img { width: 40px; height: 40px; object-fit: contain; padding: 2px; border-radius: 4px; background: #f3f4f6; border: 1px solid var(--border); }
  .tile .thumbs .more { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 4px; border: 1px dashed var(--border-strong); font-size: 12px; color: var(--text-3); }
  .tile .site { font-size: 13px; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tile .money { font-size: 14px; color: var(--text); } .tile .money b { color: var(--done); font-weight: 600; font-family: var(--font-num); }
  .tile.product { grid-template-columns: 64px minmax(0, 1fr); gap: 8px 12px; cursor: default; }
  .tile.product:hover { background: var(--bg-card); border-color: var(--border); }
  .tile.product .thumb { width: 64px; height: 64px; grid-row: span 3; }
  .tile.product h3 { white-space: normal; font-size: 14.5px; }
  .tile.product .sup { grid-column: 2; }
  .tile.product .cost { grid-column: 2; margin-top: 0; }
  /* Detail pages */
  .detail { display: grid; gap: 14px; }
  .detail .bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .detail .bar h2 { font-size: 22px; }
  .detail .bar .pill { margin-left: 4px; }
  .detail .bar .when { font-size: 13px; color: var(--text-3); }
  .panel .actions, .card .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .panel .actions .del { margin-left: auto; }
  select { padding: 7px 9px; border: 1px solid var(--border); border-radius: var(--radius-ctl); background: var(--bg-raised); color: var(--text); font: 400 13px/1.2 var(--font-ui); }
  .panel { padding: 16px 18px; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--bg-panel); display: grid; gap: 10px; align-content: start; }
  .panel h4 { margin: 0; font: 400 11px/1.2 var(--font-ui); letter-spacing: .1em; text-transform: uppercase; color: var(--text-faint); }
  .panel .body, .card .body { white-space: pre-wrap; overflow-wrap: anywhere; color: var(--text); padding: 10px 12px; border-radius: var(--radius-ctl); background: var(--bg-page); border: 1px solid var(--border); }
  .kv { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px 18px; font-size: 13.5px; }
  .kv span b { display: block; color: var(--text-faint); font-weight: 400; font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 2px; }
  .two { display: grid; grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr); gap: 14px; align-items: start; }
  table.items td.num { text-align: right; white-space: nowrap; } table.items th.num { text-align: right; }
  table.items td .quote { color: var(--done); font-weight: 600; font-family: var(--font-num); }
  input.price-in { width: 84px; padding: 4px 6px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-raised); color: var(--text); font: 500 13px/1.2 var(--font-num); text-align: right; }
  label.spec { display: inline-flex; align-items: center; gap: 5px; margin-top: 4px; font-size: 12px; color: var(--text-3); cursor: pointer; }
  label.spec input { margin: 0; accent-color: var(--btn-bg); }
  label.spec.on { color: var(--text); }
  .sum { display: grid; gap: 6px; font-size: 13.5px; } .sum div { display: flex; justify-content: space-between; gap: 12px; } .sum b { font-weight: 600; font-family: var(--font-num); } .sum .big b { font-size: 18px; color: var(--done); } .sum .dim { color: var(--text-3); }
  .empty-mini { font-size: 13px; color: var(--text-faint); }
  .size { font-size: 12.5px; color: var(--text-3); }
  /* New or edited job invoice, new task */
  .form .fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px 16px; }
  .field { display: grid; gap: 5px; align-content: start; font-size: 12.5px; color: var(--text-3); }
  .field input, .field textarea, .field select, table.lines input { width: 100%; padding: 9px 10px; border: 1px solid var(--border); border-radius: var(--radius-ctl); background: var(--bg-page); color: var(--text); font-family: var(--font-ui); font-size: 15px; font-weight: 400; line-height: 1.35; }
  .field select { background: var(--bg-page); }
  .field textarea { min-height: 80px; resize: vertical; }
  .field input:focus, .field textarea:focus, .field select:focus, table.lines input:focus { outline: none; border-color: #6A6A70; }
  .form .err, .err { color: var(--urgent); font-size: 12.5px; }
  .form .err:empty, .err:empty { display: none; }
  .field.bad input, .field.bad textarea, .field.bad select { border-color: var(--urgent); }
  table.lines { width: 100%; border-collapse: collapse; }
  table.lines th { text-align: left; font-size: 11px; font-weight: 400; line-height: 1.2; letter-spacing: .08em; text-transform: uppercase; color: var(--text-faint); padding: 0 6px 8px; white-space: nowrap; }
  table.lines th.num, table.lines td.t { text-align: right; }
  table.lines td { padding: 4px 6px; vertical-align: middle; }
  table.lines td.q { width: 96px; } table.lines td.u { width: 130px; } table.lines td.t { width: 110px; font-weight: 600; white-space: nowrap; font-family: var(--font-num); } table.lines td.x { width: 42px; }
  table.lines .rm { padding: 6px 10px; }
  .form .foot { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin-top: 4px; }
  .form .total { margin-left: auto; font-size: 14px; color: var(--text-3); } .form .total b { color: var(--done); font-size: 19px; margin: 0 6px; font-family: var(--font-num); }
  .form > .actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  /* Visitors */
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
  .stat { display: grid; gap: 4px; padding: 14px 16px; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--bg-card); }
  .stat b { font: 500 26px/1.1 var(--font-num); color: var(--text); font-variant-numeric: tabular-nums; }
  .stat span { font-size: 11.5px; color: var(--text-3); letter-spacing: .06em; text-transform: uppercase; }
  .stat small { font-size: 12.5px; color: var(--text-2); }
  .chart { display: flex; align-items: flex-end; gap: 2px; height: 170px; border-bottom: 1px solid var(--border); }
  .chart i { flex: 1 1 0; min-width: 1px; background: var(--planned); border-radius: 2px 2px 0 0; }
  .chart i:hover { background: #8DB4F2; }
  .chart i.z { height: 2px; background: var(--bg-raised); }
  .axis { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-faint); }
  .rank { display: grid; gap: 8px; font-size: 13.5px; }
  .rank > div { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 10px; align-items: baseline; }
  .rank > div > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rank b { font-weight: 500; font-family: var(--font-num); font-variant-numeric: tabular-nums; }
  .rank .bar { grid-column: 1 / -1; height: 4px; border-radius: 2px; background: var(--border); overflow: hidden; }
  .rank .bar i { display: block; height: 100%; background: var(--waiting); border-radius: 2px; }
  .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px; }
  .fine { font-size: 12.5px; color: var(--text-3); }

  /* Tasks (Today and Tasks screens) */
  .tasks { padding: 0; gap: 0; overflow: hidden; }
  .tasks .t-head { display: flex; align-items: center; gap: 8px; padding: 14px 18px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
  .tasks .t-head .ttl { font-weight: 600; margin-right: 8px; }
  .tasks .sorts { margin-left: auto; display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-3); flex-wrap: wrap; }
  .tasks .sorts button { height: 28px; padding: 0 10px; border-radius: 7px; border: 1px solid transparent; background: transparent; color: var(--text-2); font-size: 12px; cursor: pointer; }
  .tasks .sorts button[aria-pressed="true"] { background: var(--bg-chip-on); border-color: #45454A; color: #fff; }
  .trow { display: grid; grid-template-columns: 118px minmax(0, 1fr) 110px 170px 128px; gap: 12px; align-items: center; padding: 12px 18px; border-bottom: 1px solid #1F1F21; }
  .trow.hd { padding: 10px 18px; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--text-faint); border-bottom: 1px solid var(--border); }
  .trow:last-child { border-bottom: 0; }
  .trow .tt { min-width: 0; display: grid; gap: 2px; }
  .trow .tt b { font-weight: 500; overflow-wrap: anywhere; }
  .trow .tt small { font-size: 12.5px; color: var(--text-3); overflow-wrap: anywhere; }
  .trow.is-done .tt b { text-decoration: line-through; color: #B5B5B5; }
  .trow .src { font-size: 12.5px; color: var(--text-2); }
  .trow .due { display: grid; gap: 4px; }
  .trow .due .when { font: 400 12px/1.3 var(--font-num); color: var(--text-2); }
  .trow .act { display: flex; gap: 6px; align-items: center; justify-content: flex-end; flex-wrap: wrap; }
  .trow .act select { max-width: 112px; }
  .newtask { margin-bottom: 14px; }
  .coming { display: grid; gap: 8px; justify-items: start; padding: 28px 24px; }
  .coming h3 { font-size: 20px; }
  .coming p { margin: 0; color: var(--text-2); max-width: 60ch; }

  /* Settings: header photos */
  .photos { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
  .ph { display: grid; gap: 8px; padding: 10px; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--bg-card); }
  .ph .pv { position: relative; line-height: 0; border-radius: var(--radius-ctl); overflow: hidden; background: var(--bg-raised); cursor: crosshair; }
  .ph .pv img { display: block; width: 100%; height: auto; user-select: none; -webkit-user-drag: none; }
  .ph .pv .pt { position: absolute; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0, 0, 0, .7), inset 0 0 0 1px rgba(0, 0, 0, .5); pointer-events: none; }
  .ph .nm { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
  .ph .nm b { font-weight: 500; overflow-wrap: anywhere; } .ph .nm small { color: var(--text-3); font-family: var(--font-num); font-size: 11.5px; white-space: nowrap; }
  .ph .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .ph .row .hint { font-size: 12px; color: var(--text-3); flex: 1 1 100%; }
  .drop { display: grid; gap: 6px; justify-items: start; }
  .drop input[type=file] { color: var(--text-2); max-width: 100%; }

  /* Phone and tablet: the sidebar becomes a menu */
  @media (max-width: 900px) {
    .two { grid-template-columns: 1fr; }
    .side { position: fixed; left: 0; top: 0; bottom: 0; height: auto; width: min(290px, 84vw); transform: translateX(-102%); visibility: hidden; transition: transform .18s ease, visibility .18s; box-shadow: none; }
    .side.open { transform: none; visibility: visible; box-shadow: 0 0 60px rgba(0, 0, 0, .7); }
    .scrim.open { display: block; position: fixed; inset: 0; z-index: 25; background: rgba(0, 0, 0, .55); }
    .menu-btn { display: inline-flex; }
    .top { padding: 8px 14px; gap: 8px; }
    .wrap { padding: 14px 14px 32px; }
    .trow { grid-template-columns: minmax(0, 1fr) auto; gap: 6px 10px; padding: 12px 14px; }
    .trow.hd { display: none; }
    .trow .pr { grid-column: 1; grid-row: 1; } .trow .tt { grid-column: 1 / -1; grid-row: 2; }
    .trow .src { grid-column: 1; grid-row: 3; } .trow .due { grid-column: 1 / -1; grid-row: 4; } .trow .act { grid-column: 2; grid-row: 1; }
  }
  @media (max-width: 640px) {
    .band, .band.today { }
    .band .txt, .band.today .txt { padding: 14px 16px; }
    .band h1, .band.today h1 { font-size: 24px; }
    .card { padding: 14px; }
    #alerts { display: none; }
    .top .right { font-size: 12px; gap: 6px; }
    /* Tables stack: product on one line, where to buy it underneath. */
    table.items thead { display: none; }
    table.items, table.items tbody, table.items tr, table.items td { display: block; }
    table.items tr { padding: 8px 0; border-bottom: 1px solid var(--border); }
    table.items td { border: 0; padding: 3px 0; }
    table.items td.qty { display: inline-block; padding-right: 6px; } table.items td.qty + td { display: inline; }
    .sup a { flex-wrap: wrap; }
    table.lines thead { display: none; }
    table.lines tr { display: grid; grid-template-columns: 1fr 1fr auto; gap: 6px; padding: 8px 0; border-bottom: 1px solid var(--border); }
    table.lines td { padding: 0; width: auto !important; }
    table.lines td.d { grid-column: 1 / -1; } table.lines td.t { grid-column: 1 / 3; text-align: left; }
  }
  @media (prefers-reduced-motion: reduce) { .side { transition: none; } }
`;
