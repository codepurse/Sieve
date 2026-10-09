// content/trial-terms.js
// Sieve — the free-trial warning's reading half: what a trial's terms say,
// whether the page will really charge, and the words Sieve uses about it.
//
// NOT a manifest content script. content/patterns/trials.js is the part on
// every page, and all it does is notice the words "free trial"; only a page
// that has them asks for this file (the service worker injects it, as it
// does content/tells-ui.js). See trials.js for what counts and why.
//
// parseTerms() and trialDates() are pure — string in, terms out — and are
// what test/trial-terms-test.mjs pins.

(() => {
  "use strict";

  if (window.SieveTrials) return;

  const TYPE = "trials";

  // ---------------------------------------------------------------------------
  // Reading the terms
  // ---------------------------------------------------------------------------

  const WORD_NUMBERS = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, twelve: 12, fourteen: 14, thirty: 30, sixty: 60, ninety: 90,
  };
  const NUM = "(\\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fourteen|thirty|sixty|ninety)";
  const UNIT = "(day|week|month|year)s?";

  // How long, in the forms trials are written: "7-day free trial", "free for 30
  // days", "1 month free", "first month free", "a trial of 14 days".
  const LENGTH_PATTERNS = [
    new RegExp(`\\b${NUM}[\\s-]*${UNIT}[\\s-]+(?:free[\\s-]+)?trial\\b`, "i"),
    new RegExp(`\\bfree\\s+for\\s+${NUM}\\s*${UNIT}\\b`, "i"),
    new RegExp(`\\b${NUM}[\\s-]*${UNIT}\\s+(?:for\\s+)?free\\b`, "i"),
    new RegExp(`\\btrial\\s+(?:period\\s+)?(?:of|for|lasts?)\\s+${NUM}\\s*${UNIT}\\b`, "i"),
  ];
  const FIRST_FREE_RE = /\bfirst\s+(day|week|month)\s+(?:is\s+)?free\b/i;
  const MAX_LENGTH = { day: 365, week: 52, month: 24, year: 2 };

  // A price, and the interval written after it: "$14.99/month", "€9 per month",
  // "£79.99 a year", "14,99 € monthly".
  // (A symbol written AFTER the amount, "12,99 €", is not followed by a word
  // boundary — "€" is not a word character — so only the letter codes get \b.)
  const PRICE_RE = /(?:([$€£¥₹])\s?(\d{1,5}(?:[.,]\d{2})?)|(\d{1,5}(?:[.,]\d{2})?)\s?(€|£|(?:usd|eur|gbp|cad|aud)\b))\s*(?:\/\s*|per\s+|a\s+|an\s+|each\s+|every\s+)?(month|mo|year|yr|annum|week|wk|monthly|annually|yearly|weekly)\b/gi;
  const INTERVALS = {
    month: "month", mo: "month", monthly: "month",
    year: "year", yr: "year", annum: "year", annually: "year", yearly: "year",
    week: "week", wk: "week", weekly: "week",
  };

  // Wording that says the trial charges by itself when it ends.
  const RENEW_RE = /\b(?:then|thereafter|afterwards?)\s+(?:only\s+|just\s+)?(?:[$€£¥₹]|\d)|\bafter\s+(?:the|your)\s+(?:free\s+)?trial\b|\bauto(?:matically)?[\s-]?(?:renew|charge|bill)|\brenews?\b|\brecurring\b|\bbilled\b|\bwill\s+be\s+charged\b|\buntil\s+(?:you\s+)?cancel|\bcancel\s+any\s?time\b/i;

  // ...and wording that says it does not.
  const NO_CARD_RE = /\bno\s+(?:credit\s+)?card\s+(?:required|needed)\b|\bno\s+payment\s+(?:details?\s+|info(?:rmation)?\s+)?(?:required|needed)\b|\bwithout\s+(?:a\s+)?(?:credit\s+)?card\b|\bno\s+credit\s+card\b/i;

  function toNumber(word) {
    const w = String(word).toLowerCase();
    return /^\d+$/.test(w) ? parseInt(w, 10) : WORD_NUMBERS[w] || null;
  }

  function parseLength(text) {
    for (const re of LENGTH_PATTERNS) {
      const m = re.exec(text);
      if (!m) continue;
      const n = toNumber(m[1]);
      const unit = m[2].toLowerCase();
      if (n && n <= MAX_LENGTH[unit]) return { n, unit };
    }
    const first = FIRST_FREE_RE.exec(text);
    return first ? { n: 1, unit: first[1].toLowerCase() } : null;
  }

  // The first non-zero price with an interval: "$0 today" is the trial, not
  // what comes after it.
  function parsePrice(text) {
    PRICE_RE.lastIndex = 0;
    let m;
    while ((m = PRICE_RE.exec(text))) {
      const symbol = m[1] || "";
      const amount = m[2] || m[3];
      const code = m[4] || "";
      if (parseFloat(amount.replace(",", ".")) <= 0) continue;
      const shown = symbol ? `${symbol}${amount}` : `${amount} ${code.length === 1 ? code : code.toUpperCase()}`;
      return { amount: shown, interval: INTERVALS[m[5].toLowerCase()] };
    }
    return null;
  }

  function parseTerms(raw) {
    const text = String(raw || "").replace(/\s+/g, " ");
    return {
      length: parseLength(text),
      price: parsePrice(text),
      renews: RENEW_RE.test(text),
      noCard: NO_CARD_RE.test(text),
    };
  }

  // When the trial ends if it starts at `start`, and when to remind: two days
  // before for a trial of a week or more, one day before for a shorter one,
  // and a few hours before for a trial of a day. A reminder is due from the
  // START of its day, so it shows on the first page you open that day.
  function trialDates(length, start) {
    const end = new Date(start);
    if (length.unit === "day") end.setDate(end.getDate() + length.n);
    else if (length.unit === "week") end.setDate(end.getDate() + 7 * length.n);
    else if (length.unit === "month") end.setMonth(end.getMonth() + length.n);
    else end.setFullYear(end.getFullYear() + length.n);

    const days = (end.getTime() - start) / 86400000;
    let remind;
    if (days >= 2) {
      remind = new Date(end);
      remind.setDate(remind.getDate() - (days >= 7 ? 2 : 1));
      remind.setHours(0, 0, 0, 0);
    } else {
      remind = new Date(end.getTime() - 3 * 3600000);
    }
    return { end: end.getTime(), remind: remind.getTime() };
  }

  // ---------------------------------------------------------------------------
  // Words
  // ---------------------------------------------------------------------------

  function dayText(ms) {
    return new Date(ms).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  function lengthText(length) {
    return `${length.n} ${length.unit}${length.n === 1 ? "" : "s"}`;
  }

  function priceText(price) {
    return `${price.amount} a ${price.interval}`;
  }

  // ---------------------------------------------------------------------------
  // The page: will it really charge?
  // ---------------------------------------------------------------------------

  // Somewhere to pay: a card field, or a payment provider's card frame.
  const PAYMENT_SELECTOR = [
    'input[autocomplete^="cc-"]',
    'input[name*="card" i]',
    'input[id*="card" i]',
    'iframe[name^="__privateStripeFrame"]',
    'iframe[src*="js.stripe.com"]',
    'iframe[src*="braintree"]',
    'iframe[src*="adyen"]',
    'iframe[title*="card" i]',
  ].join(", ");

  function hasPaymentForm() {
    try {
      return !!document.querySelector(PAYMENT_SELECTOR);
    } catch (_) {
      return false;
    }
  }

  // ...or at least somewhere to sign up. Without one, the page is talking ABOUT
  // a trial — a review quoting "then $9.99/month" — not offering one.
  const SIGNUP_RE =
    /\b(?:start|begin|try|claim|activate|get|unlock)\b.{0,25}\b(?:free|trial)\b|\bfree\s+trial\b|\bsubscribe\b|\bsign\s?up\b|\bjoin\s+now\b|\bget\s+started\b/i;

  function hasSignupButton() {
    const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"], a');
    for (let i = 0; i < buttons.length && i < 400; i++) {
      const text = buttons[i].tagName === "INPUT" ? buttons[i].value : buttons[i].textContent;
      if (text && text.length <= 40 && SIGNUP_RE.test(text)) return true;
    }
    return false;
  }

  // The block's words with a space between elements. textContent runs them
  // together — a heading "Premium" and a line "1 month free" read as
  // "Premium1 month free" — and the "1" then never starts a word.
  function blockText(block) {
    const parts = [];
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) parts.push(node.nodeValue);
    return parts.join(" ");
  }

  function score(terms) {
    return (terms.length ? 2 : 0) + (terms.price ? 2 : 0) + (terms.renews ? 1 : 0);
  }

  // Of the offer blocks a page gathered, the best-described one — or null when
  // the page does not show that its trial will charge, or says nothing worth
  // saying about it.
  function judge(blocks) {
    let best = null;
    for (const block of blocks) {
      const terms = parseTerms(blockText(block));
      if (terms.noCard) return null; // the page says the trial needs no card: it just ends
      if (!best || score(terms) > score(best.terms)) best = { block, terms };
    }
    if (!best) return null;
    const t = best.terms;
    // It has to be shown to charge by itself: a card form, or renewal wording
    // on a page you can actually sign up on...
    if (!hasPaymentForm() && !(t.renews && hasSignupButton())) return null;
    // ...and there has to be something to say: how long, or how much.
    if (!t.length && !t.price) return null;
    return best;
  }

  // ---------------------------------------------------------------------------
  // The finding
  // ---------------------------------------------------------------------------

  // The spec handed to ctx.tell(). `ask` sends a message to the service worker
  // and resolves to its reply.
  function describe(terms, ctx, ask) {
    const dates = terms.length ? trialDates(terms.length, Date.now()) : null;
    let reminderSet = false;

    let title;
    let detail;
    let label;
    if (terms.length && terms.price) {
      title = `After ${lengthText(terms.length)}, this becomes ${priceText(terms.price)}.`;
      detail = `Start today and the first payment is due ${dayText(dates.end)}. Cancel before then to pay nothing.`;
      label = `Then ${terms.price.amount}/${terms.price.interval}`;
    } else if (terms.length) {
      title = `After ${lengthText(terms.length)}, this trial turns into a paid plan.`;
      detail = `The price isn't shown beside the offer. Start today and it ends ${dayText(dates.end)}; cancel before then to pay nothing.`;
      label = "Paid after the trial";
    } else {
      title = `This free trial turns into ${priceText(terms.price)}.`;
      detail = "How long the trial lasts isn't shown beside the offer.";
      label = `Then ${terms.price.amount}/${terms.price.interval}`;
    }

    const actions = () =>
      dates
        ? [
            {
              id: "remind",
              label: reminderSet ? `Reminder set for ${dayText(dates.remind)}` : `Remind me on ${dayText(dates.remind)}`,
              disabled: reminderSet,
            },
          ]
        : [];

    return {
      type: TYPE,
      // With a length there is a date, and a note worth showing; without one
      // there is only a price to point at.
      confidence: dates ? "medium" : "low",
      title: "A free trial that becomes a payment",
      detail: `${title} ${detail}`,
      label,
      done: "Explained",
      drawn: true,
      defuse: (el, ui, finding) =>
        ui.addNote(el, finding, {
          kicker: "Sieve · about this free trial",
          title,
          detail,
          actions: actions(),
          onAction: (id) => ctx.runAction(finding, id),
        }),
      actions,
      onAction: (id) => {
        if (id !== "remind" || !dates || reminderSet) return null;
        return ask({
          type: "sieve:trial-remind",
          ends: dates.end,
          remindAt: dates.remind,
          terms: terms.price ? priceText(terms.price) : "",
        }).then((reply) => {
          if (reply && reply.ok) reminderSet = true;
        });
      },
    };
  }

  // What the reminder banner says, for a reminder that has fallen due.
  function reminderBanner(r, ask) {
    const over = r.ends <= Date.now();
    return {
      kicker: "Sieve · reminder",
      title: over
        ? `Your free trial at ${r.host} ended ${dayText(r.ends)}.`
        : `Your free trial at ${r.host} ends ${dayText(r.ends)}.`,
      detail: over
        ? "If you didn't cancel, it may have started charging you."
        : r.terms
          ? `After that it costs ${r.terms}. Cancel before then if you don't want to pay.`
          : "Cancel before then if you don't want to pay for it.",
      actions: over
        ? [{ id: "done", label: "Done" }]
        : [
            { id: "done", label: "Done" },
            { id: "snooze", label: "Remind me tomorrow" },
          ],
      onAction: (id) => ask({ type: id === "done" ? "sieve:trial-done" : "sieve:trial-snooze", id: r.id }),
      // Closed without choosing: back in a few hours, not on the next page —
      // or, once the trial is over, gone.
      onClose: () =>
        ask(over ? { type: "sieve:trial-done", id: r.id } : { type: "sieve:trial-snooze", id: r.id, hours: 4 }),
    };
  }

  window.SieveTrials = { parseTerms, trialDates, judge, describe, reminderBanner };
})();
