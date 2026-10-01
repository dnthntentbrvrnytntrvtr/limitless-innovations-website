/* Shared building blocks of the private desk: the five priority colours (pill and dot) and the TimeBar.

   Everything lives inside one factory function so the very same code can run in two places:
   - here in the Worker and in the unit tests (npm test), and
   - in the browser, where desk.js pastes the factory's source into the desk page (DESK_UI_CLIENT).
   So: no imports, no outside names, nothing but plain JavaScript in makeDeskUI.

   Colours never carry meaning alone: every pill, dot and bar comes with words ("Urgent", "12 days left"). */

export function makeDeskUI() {
  const MIN = 60000, HOUR = 3600000, DAY = 86400000;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---- priorities (SPEC section 3) ---- */
  const PRIORITIES = {
    urgent:  { label: 'Urgent',    rank: 0 },   // do today, overdue, expired
    soon:    { label: 'This week', rank: 1 },   // due within 7 days, expiring within 30 days
    planned: { label: 'Planned',   rank: 2 },   // has a date more than 7 days away
    waiting: { label: 'Waiting',   rank: 3 },   // waiting on someone else
    done:    { label: 'Done',      rank: 4 }    // done, valid, paid
  };
  const priorityKey = k => (Object.prototype.hasOwnProperty.call(PRIORITIES, k) ? k : 'planned');
  const priorityLabel = k => PRIORITIES[priorityKey(k)].label;
  // Tinted background, coloured border and text (see .pri in the desk stylesheet), plus the words.
  const pill = k => { k = priorityKey(k); return '<span class="pri pri-' + k + '"><i class="pri-dot" aria-hidden="true"></i>' + esc(PRIORITIES[k].label) + '</span>'; };
  // A dot on its own still has its word for screen readers and as a tooltip.
  const dot = k => { k = priorityKey(k); return '<span class="pri-dot-wrap pri-' + k + '" title="' + esc(PRIORITIES[k].label) + '"><i class="pri-dot" aria-hidden="true"></i><span class="sr">' + esc(PRIORITIES[k].label) + '</span></span>'; };

  /* ---- TimeBar (SPEC section 6) ---- */
  const parseTime = v => {
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.trim()) return Date.parse(v);
    return NaN;
  };
  const num = (n, digits) => Number(n).toLocaleString('en-GB', { maximumFractionDigits: digits == null ? 1 : digits });

  // "3 h", "40 min", "12 days", "less than a day". unit: 'hours', 'days' or 'auto' (hours under 48 h, days above).
  function formatDuration(ms, unit) {
    const a = Math.abs(ms);
    if (!unit || unit === 'auto') unit = a < 2 * DAY ? 'hours' : 'days';
    if (unit === 'hours') {
      if (a < MIN) return 'under a minute';
      if (a < HOUR) return Math.floor(a / MIN) + ' min';
      return Math.floor(a / HOUR) + ' h';
    }
    const d = Math.floor(a / DAY);
    if (d === 0) return 'less than a day';
    return d === 1 ? '1 day' : d + ' days';
  }

  // Colour rules by kind of thing (time left before it is due). Pass as opts.preset, or give your own
  // urgentLeft / soonLeft (milliseconds left) and farState.
  const PRESETS = {
    certificate: { urgentLeft: 7 * DAY, soonLeft: 30 * DAY, farState: 'done' },      // red at 7 days or expired, amber at 30
    renewal:     { urgentLeft: 7 * DAY, soonLeft: 30 * DAY, farState: 'done' },
    deadline:    { urgentLeft: 14 * DAY, soonLeft: 60 * DAY, farState: 'done' },
    invoice:     { urgentLeft: 0, soonLeft: 7 * DAY, farState: 'done' },             // red once late, amber in the last 7 days
    due:         { urgentLeft: 0, soonLeft: 7 * DAY, farState: 'planned' }           // a task's due date: red today or late, amber within 7 days, blue beyond
  };

  /* timeBar(start, end, now, mode, opts) -> { state, fraction, fill, label, over }
     state    urgent | soon | planned | waiting | done  (the colour; "waiting" is also used for "no date")
     fraction 0..1, the true share (remaining: time left / total; elapsed: time used / total; usage: used / limit)
     fill     whole percent to draw (3 minimum so a sliver shows; 100 once it's over)
     label    always in words
     mode     'remaining' (certificates, invoices), 'elapsed' (deadlines, step limits) or 'usage' (quotas).
              For 'usage': start = the baseline (0), end = the limit, now = the amount used.
     opts     preset, urgentLeft, soonLeft, farState, urgentFrac, soonFrac (usage), unit ('hours'|'days'|'auto'),
              pastWord ('late'|'over'|'expired'), showTotal (add "of 14 days"), suffix (usage unit, e.g. ' GB'),
              digits (usage decimals), done + doneLabel (a finished thing), emptyLabel */
  function timeBar(start, end, now, mode, opts) {
    const o = Object.assign({}, (opts && PRESETS[opts.preset]) || {}, opts || {});
    mode = mode === 'elapsed' || mode === 'usage' ? mode : 'remaining';
    if (o.done) return { state: 'done', fraction: 1, fill: 100, label: o.doneLabel || 'Done', over: false };

    const e = mode === 'usage' ? Number(end) : parseTime(end);
    const n = mode === 'usage' ? Number(now) : parseTime(now == null ? Date.now() : now);
    const s = mode === 'usage' ? (start == null || start === '' ? 0 : Number(start)) : parseTime(start);
    if (!isFinite(e) || !isFinite(n) || !isFinite(s)) return { state: 'waiting', fraction: 0, fill: 0, label: o.emptyLabel || 'No date set', over: false };

    const clamp = x => Math.max(0, Math.min(1, x));
    const fillOf = (frac, over) => over ? 100 : (frac > 0 ? Math.max(3, Math.round(frac * 100)) : 0);
    const total = e - s;

    if (mode === 'usage') {
      const used = n - s, frac = total > 0 ? used / total : (used > 0 ? 1 : 0);
      const urgentFrac = o.urgentFrac == null ? 0.9 : o.urgentFrac, soonFrac = o.soonFrac == null ? 0.7 : o.soonFrac;
      const state = frac >= urgentFrac ? 'urgent' : frac >= soonFrac ? 'soon' : 'planned';
      const sfx = o.suffix || '';
      let label = num(used, o.digits) + ' of ' + num(total, o.digits) + sfx;
      if (used > total) label += ' (' + num(used - total, o.digits) + sfx + ' over)';
      return { state, fraction: clamp(frac), fill: fillOf(clamp(frac), used > total), label, over: used > total };
    }

    const left = e - n, elapsed = n - s, over = left < 0;
    const frac = mode === 'remaining' ? (total > 0 ? left / total : (left > 0 ? 1 : 0)) : (total > 0 ? elapsed / total : (elapsed >= 0 ? 1 : 0));
    const fraction = clamp(frac);

    let state;
    if (over) state = 'urgent';
    else if (o.urgentLeft != null || o.soonLeft != null) {
      const urgentLeft = o.urgentLeft == null ? 0 : o.urgentLeft, soonLeft = o.soonLeft == null ? 7 * DAY : o.soonLeft;
      state = left <= urgentLeft ? 'urgent' : left <= soonLeft ? 'soon' : (o.farState || (mode === 'remaining' ? 'done' : 'planned'));
    } else if (mode === 'elapsed') state = fraction >= 1 ? 'urgent' : fraction >= 0.6 ? 'soon' : (o.farState || 'planned');   // by how much of the limit is used up
    else state = left <= 7 * DAY ? 'soon' : (o.farState || 'done');

    let label;
    if (over) {
      const d = formatDuration(left, o.unit), word = o.pastWord || (mode === 'elapsed' ? 'over' : 'late');
      label = word === 'expired' ? 'Expired ' + d + ' ago' : word === 'over' ? d + ' over the ' + formatDuration(total, o.unit) + ' limit' : d + ' ' + word;
    } else if (left === 0) label = 'due now';
    else label = formatDuration(left, o.unit) + ' left' + (o.showTotal ? ' of ' + formatDuration(total, o.unit) : '');
    return { state, fraction, fill: fillOf(fraction, over), label, over };
  }

  // The bar as HTML: a track with a coloured fill, and the words underneath (classes .tb in the desk stylesheet).
  const renderTimeBar = r => '<div class="tb tb-' + r.state + '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + r.fill + '" aria-valuetext="' + esc(r.label) + '">' +
    '<div class="tb-track"><i style="width:' + r.fill + '%"></i></div><span class="tb-label">' + esc(r.label) + '</span></div>';
  const TimeBar = (start, end, now, mode, opts) => renderTimeBar(timeBar(start, end, now, mode, opts));

  return { esc, PRIORITIES, priorityKey, priorityLabel, pill, dot, parseTime, formatDuration, timeBar, renderTimeBar, TimeBar, PRESETS };
}

export const ui = makeDeskUI();

// The same code, as text for the desk page's script (it becomes `const UI = (function makeDeskUI() {...})();`).
// Cloudflare's bundler (wrangler, keep_names) wraps inner functions in __name(...) calls, which then appear in
// makeDeskUI's source text; the page has no __name, so it gets a do-nothing one first.
export const DESK_UI_CLIENT = 'var __name = function (f) { return f; };\nconst UI = (' + makeDeskUI.toString() + ')();';
