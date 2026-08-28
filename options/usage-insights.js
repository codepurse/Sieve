// options/usage-insights.js
// Sieve — the Usage Insights report: the ridge chart, the share ring and the
// site list. Loaded on demand by options.js (like common/stats.js is), so the
// chart code stays out of the settings page until the section is set up.
//
// Everything is drawn by hand as SVG against the tokens in options.css. Three
// deliberate choices, because a chart is where generic defaults show:
//
//  * The curve is a Fritsch-Carlson monotone cubic, not a polyline and not a
//    loose Catmull-Rom. A loose spline overshoots between points, which on a
//    chart of time spent invents evenings that never happened and dips below
//    zero. Monotone interpolation cannot overshoot.
//  * Switching Today <-> This week MORPHS the ridge instead of swapping it:
//    both series are resampled off their true curve to a common resolution and
//    tweened, so the shape flows from one shape to the other.
//  * The ring and the site list are one component in two views. Hovering
//    either highlights both, and the ring centre reads out whatever is focused.

import {
  getUsageDays,
  mergeDays,
  rankDomains,
  clearUsage,
  OTHER_BUCKET,
  USAGE_ENABLED_KEY,
  USAGE_RETENTION_KEY,
  DEFAULT_RETENTION_DAYS,
  RETENTION_CHOICES,
} from "../common/usage-store.js";

// --- plot geometry --------------------------------------------------------
// A fixed viewBox scaled uniformly by CSS (width:100%, height:auto), so one
// set of numbers describes the chart at every window width and stroke weights
// stay in proportion.
const W = 760;
const H = 240;
// The right padding is a gutter for the scale, so a tick label can never end
// up sitting behind the line it is measuring.
const PAD = { top: 30, right: 46, bottom: 34, left: 16 };
const PLOT = {
  x0: PAD.left,
  x1: W - PAD.right,
  y0: PAD.top,
  y1: H - PAD.bottom,
};

// How many points the ridge is drawn from. The data has 7 (days) or 24 (hours);
// both are resampled to this so one can be tweened into the other. At this
// density the segments are ~5px wide, which reads as a smooth curve.
const SAMPLES = 160;

const SVG_NS = "http://www.w3.org/2000/svg";

// Axis ladder, in ms. The top gridline lands on whichever of these first
// clears the busiest bucket, so labels are always round numbers.
const TICK_LADDER = [
  5 * 60e3, 15 * 60e3, 30 * 60e3, 60 * 60e3, 2 * 3600e3,
  3 * 3600e3, 4 * 3600e3, 6 * 3600e3, 8 * 3600e3, 12 * 3600e3, 24 * 3600e3,
];

// In-family hues, not a rainbow: indigo, sky, violet, teal, amber, then slate
// for the tail. Ordered so the two busiest sites carry the brand colours.
const SITE_COLORS = ["#818cf8", "#38bdf8", "#a78bfa", "#2dd4bf", "#fbbf24"];
const REST_COLOR = "#64748b";

const TOP_SITES = 5;
const MS_PER_MIN = 60000;

// --- small helpers --------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function svg(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null) continue;
    node.setAttribute(key, String(value));
  }
  return node;
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** "4h 21m" / "42m" / "38s" — the plain reading, used in tooltips and rows. */
function fmtDuration(ms) {
  if (!ms || ms < 1000) return "0m";
  const minutes = Math.round(ms / MS_PER_MIN);
  if (minutes === 0) return `${Math.max(1, Math.round(ms / 1000))}s`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** The same duration split into value/unit pairs, so the hero can set the
 *  units smaller than the digits instead of shouting "H" at full size. */
function fmtDurationParts(ms) {
  if (!ms || ms < 1000) return [{ value: "0", unit: "m" }];
  const minutes = Math.round(ms / MS_PER_MIN);
  if (minutes === 0) return [{ value: String(Math.max(1, Math.round(ms / 1000))), unit: "s" }];
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts = [];
  if (h > 0) parts.push({ value: String(h), unit: "h" });
  if (m > 0 || h === 0) parts.push({ value: String(m), unit: "m" });
  return parts;
}

/** Compact form for axis labels. */
function fmtTick(ms) {
  if (ms >= 3600e3) {
    const h = ms / 3600e3;
    return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
  }
  return `${Math.round(ms / MS_PER_MIN)}m`;
}

// Respect the reader's clock: "9 PM" or "21:00", whichever their locale uses.
function fmtHour(hour) {
  try {
    const d = new Date(2000, 0, 1, hour, 0, 0);
    return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(d);
  } catch {
    return `${hour}:00`;
  }
}

function fmtWeekday(date) {
  try {
    return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
  } catch {
    return date.toDateString().slice(0, 3);
  }
}

function fmtLongDay(date, isToday) {
  if (isToday) return "Today";
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short", day: "numeric", month: "short",
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

function domainLabel(domain) {
  return domain === OTHER_BUCKET ? "Other sites" : domain;
}

// --- animation ------------------------------------------------------------

// Matches --ease in options.css: a fast start that settles rather than
// bouncing, so a value tween feels like the rest of the page.
function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

/**
 * One rAF tween. Returns a cancel function; a second tween on the same handle
 * cancels the first, so a fast Today/Week/Today click cannot leave two frames
 * fighting over the same path.
 */
function tween(durationMs, onFrame) {
  if (reducedMotion() || durationMs <= 0) {
    onFrame(1);
    return () => {};
  }
  let raf = 0;
  const started = performance.now();
  const step = (now) => {
    const t = clamp((now - started) / durationMs, 0, 1);
    onFrame(easeOutQuint(t));
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

// --- the curve ------------------------------------------------------------

/**
 * Fritsch-Carlson monotone cubic tangents. These are what keep the curve from
 * overshooting: where the data turns, the tangent is flattened to zero instead
 * of carrying the curve past the point it is meant to pass through.
 */
function monotoneTangents(values) {
  const n = values.length;
  const slopes = new Array(Math.max(0, n - 1));
  for (let i = 0; i < n - 1; i++) slopes[i] = values[i + 1] - values[i];

  const tangents = new Array(n).fill(0);
  if (n < 2) return tangents;
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];

  for (let i = 1; i < n - 1; i++) {
    const prev = slopes[i - 1];
    const next = slopes[i];
    if (prev * next <= 0) {
      tangents[i] = 0; // a turning point — flatten, do not overshoot
    } else {
      tangents[i] = (prev + next) / 2;
      // Keep the tangent inside three times the smaller neighbouring slope,
      // the Fritsch-Carlson monotonicity condition.
      const limit = 3 * Math.min(Math.abs(prev), Math.abs(next));
      if (Math.abs(tangents[i]) > limit) {
        tangents[i] = Math.sign(tangents[i]) * limit;
      }
    }
  }
  return tangents;
}

/**
 * Resample a series to SAMPLES points by evaluating its own monotone cubic,
 * not by straightening it into segments first. This is what makes the morph
 * honest: at every frame the shape on screen is a real curve through the data.
 */
function resample(values, count = SAMPLES) {
  const n = values.length;
  if (n === 0) return new Array(count).fill(0);
  if (n === 1) return new Array(count).fill(values[0]);

  const tangents = monotoneTangents(values);
  const out = new Array(count);
  for (let j = 0; j < count; j++) {
    const pos = (j / (count - 1)) * (n - 1);
    const i = Math.min(n - 2, Math.floor(pos));
    const t = pos - i;
    const t2 = t * t;
    const t3 = t2 * t;
    // Cubic Hermite basis.
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    out[j] =
      h00 * values[i] + h10 * tangents[i] + h01 * values[i + 1] + h11 * tangents[i + 1];
  }
  return out;
}

function xAt(index, count) {
  if (count <= 1) return (PLOT.x0 + PLOT.x1) / 2;
  return PLOT.x0 + (index / (count - 1)) * (PLOT.x1 - PLOT.x0);
}

function yAt(value, max) {
  const safe = max > 0 ? clamp(value / max, 0, 1) : 0;
  return PLOT.y1 - safe * (PLOT.y1 - PLOT.y0);
}

function ridgePath(samples, max) {
  let d = "";
  for (let j = 0; j < samples.length; j++) {
    const x = xAt(j, samples.length).toFixed(2);
    const y = yAt(Math.max(0, samples[j]), max).toFixed(2);
    d += `${j === 0 ? "M" : "L"} ${x} ${y} `;
  }
  return d.trim();
}

function areaPath(samples, max) {
  if (samples.length === 0) return "";
  return `${ridgePath(samples, max)} L ${PLOT.x1} ${PLOT.y1} L ${PLOT.x0} ${PLOT.y1} Z`;
}

/**
 * Pick the scale. Aiming for about three gridlines, take the first ladder step
 * that would cover the peak in three, then round the top of the axis up to a
 * whole number of those steps. Every tick is therefore a round duration — the
 * reason this is not simply peak/3, which yields labels like "2.7h".
 */
function computeTicks(peak) {
  const target = Math.max(peak, 1) / 3;
  const step = TICK_LADDER.find((s) => s >= target) || TICK_LADDER[TICK_LADDER.length - 1];
  const steps = Math.max(1, Math.ceil(peak / step));
  const ticks = [];
  for (let i = 1; i <= steps; i++) ticks.push(i * step);
  return { axisMax: steps * step, ticks };
}

// --- the report ----------------------------------------------------------

export async function setupUsageInsights(store) {
  const section = document.getElementById("section-usage");
  if (!section) return;

  const toggle = document.getElementById("usage-toggle");
  const statusBadge = document.getElementById("usage-status");
  const retentionSelect = document.getElementById("usage-retention");
  const clearBtn = document.getElementById("usage-clear");
  const clearNote = document.getElementById("usage-clear-note");
  const report = document.getElementById("usage-report");
  if (!toggle || !report) return;

  // --- settings row ------------------------------------------------------

  let enabled = store[USAGE_ENABLED_KEY] === true;
  let retention = Number(store[USAGE_RETENTION_KEY]) || DEFAULT_RETENTION_DAYS;

  toggle.checked = enabled;
  if (retentionSelect) {
    retentionSelect.textContent = "";
    for (const days of RETENTION_CHOICES) {
      const option = el("option", "", `${days} days`);
      option.value = String(days);
      retentionSelect.append(option);
    }
    retentionSelect.value = String(
      RETENTION_CHOICES.includes(retention) ? retention : DEFAULT_RETENTION_DAYS
    );
  }

  function applyEnabledState() {
    if (statusBadge) {
      statusBadge.textContent = enabled ? "On" : "Off";
      statusBadge.classList.toggle("on", enabled);
    }
    report.hidden = !enabled;
    if (retentionSelect) retentionSelect.disabled = !enabled;
  }
  applyEnabledState();

  toggle.addEventListener("change", async () => {
    enabled = toggle.checked;
    // No Guardian gate here on purpose: this is a mirror, not a protection.
    // Turning it off removes a measurement, it does not weaken any blocker.
    await chrome.storage.local.set({ [USAGE_ENABLED_KEY]: enabled });
    applyEnabledState();
    if (enabled) await render({ animate: true });
  });

  retentionSelect?.addEventListener("change", async () => {
    retention = Number(retentionSelect.value) || DEFAULT_RETENTION_DAYS;
    await chrome.storage.local.set({ [USAGE_RETENTION_KEY]: retention });
    await render({ animate: false });
  });

  clearBtn?.addEventListener("click", async () => {
    if (clearNote) clearNote.textContent = "";
    // The service worker owns every write to the store, so clearing goes
    // through it and cannot interleave with a flush that is already in flight.
    let ok = false;
    try {
      const resp = await chrome.runtime.sendMessage({ type: "SIEVE_USAGE_CLEAR" });
      ok = !!resp?.ok;
    } catch {
      // The worker was asleep and the message did not land — fall back to
      // clearing from here, which is safe because nothing else is writing yet.
      try {
        await clearUsage();
        ok = true;
      } catch {
        ok = false;
      }
    }
    if (clearNote) {
      clearNote.textContent = ok
        ? "History cleared."
        : "Could not clear the history — try again.";
    }
    await render({ animate: true });
  });

  // --- report scaffolding ------------------------------------------------

  const tabsEl = document.getElementById("usage-tabs");
  const heroTotal = document.getElementById("usage-total");
  const heroDelta = document.getElementById("usage-delta");
  const heroSub = document.getElementById("usage-sub");
  const plate = document.getElementById("usage-plate");
  const sitesEl = document.getElementById("usage-sites");
  const ringHost = document.getElementById("usage-ring");
  const srEl = document.getElementById("usage-sr");
  const emptyEl = document.getElementById("usage-empty");
  const splitEl = document.getElementById("usage-split");

  let period = "today"; // "today" | "week"
  let cancelRidgeTween = () => {};
  let cancelNumberTween = () => {};

  // What is on screen right now, so a period change tweens from it rather than
  // from zero, and a live storage update does not restart the entrance.
  let shownSamples = new Array(SAMPLES).fill(0);
  let shownMax = TICK_LADDER[0];
  let shownTotal = 0;
  let hasRendered = false;

  const chart = buildChart();
  plate?.append(chart.svg);

  const tooltip = el("div", "usage-tip");
  tooltip.hidden = true;
  plate?.append(tooltip);

  // --- chart construction (built once, updated in place) -----------------

  function buildChart() {
    const root = svg("svg", {
      viewBox: `0 0 ${W} ${H}`,
      class: "usage-plot",
      role: "img",
      "aria-label": "Screen time chart",
      preserveAspectRatio: "xMidYMid meet",
    });

    const defs = svg("defs", {});

    // The line: indigo into sky, left to right.
    const stroke = svg("linearGradient", {
      id: "usageRidgeStroke", x1: "0", y1: "0", x2: "1", y2: "0",
    });
    stroke.append(
      svg("stop", { offset: "0%", "stop-color": "#6366f1" }),
      svg("stop", { offset: "52%", "stop-color": "#2575fc" }),
      svg("stop", { offset: "100%", "stop-color": "#38bdf8" })
    );

    // The fill: the aurora under the card, fading out before the baseline.
    const fill = svg("linearGradient", {
      id: "usageRidgeFill", x1: "0", y1: "0", x2: "0", y2: "1",
    });
    fill.append(
      svg("stop", { offset: "0%", "stop-color": "#6366f1", "stop-opacity": "0.42" }),
      svg("stop", { offset: "55%", "stop-color": "#3b82f6", "stop-opacity": "0.14" }),
      svg("stop", { offset: "100%", "stop-color": "#38bdf8", "stop-opacity": "0" })
    );

    // The cursor beam — a soft column of light under the reading, instead of
    // the usual hard dashed crosshair.
    const beam = svg("linearGradient", {
      id: "usageBeam", x1: "0", y1: "0", x2: "1", y2: "0",
    });
    beam.append(
      svg("stop", { offset: "0%", "stop-color": "#a5b4fc", "stop-opacity": "0" }),
      svg("stop", { offset: "50%", "stop-color": "#a5b4fc", "stop-opacity": "0.16" }),
      svg("stop", { offset: "100%", "stop-color": "#a5b4fc", "stop-opacity": "0" })
    );

    // The baseline fades out at both ends rather than stopping dead.
    const base = svg("linearGradient", {
      id: "usageBaseline", x1: "0", y1: "0", x2: "1", y2: "0",
    });
    base.append(
      svg("stop", { offset: "0%", "stop-color": "#ffffff", "stop-opacity": "0" }),
      svg("stop", { offset: "18%", "stop-color": "#ffffff", "stop-opacity": "0.12" }),
      svg("stop", { offset: "82%", "stop-color": "#ffffff", "stop-opacity": "0.12" }),
      svg("stop", { offset: "100%", "stop-color": "#ffffff", "stop-opacity": "0" })
    );

    const glow = svg("filter", {
      id: "usageGlow", x: "-12%", y: "-40%", width: "124%", height: "200%",
    });
    glow.append(svg("feGaussianBlur", { stdDeviation: "7", result: "blur" }));

    defs.append(stroke, fill, beam, base, glow);
    root.append(defs);

    const grid = svg("g", { class: "usage-grid" });
    const gridLabels = svg("g", { class: "usage-grid-labels" });
    const baseline = svg("line", {
      class: "usage-baseline",
      x1: PLOT.x0, y1: PLOT.y1, x2: PLOT.x1, y2: PLOT.y1,
      stroke: "url(#usageBaseline)",
    });

    const beamRect = svg("rect", {
      class: "usage-beam",
      x: 0, y: PLOT.y0 - 12, width: 46, height: PLOT.y1 - PLOT.y0 + 12,
      fill: "url(#usageBeam)", opacity: "0",
    });

    const area = svg("path", { class: "usage-area", fill: "url(#usageRidgeFill)", d: "" });
    const ridgeGlow = svg("path", {
      class: "usage-ridge-glow", d: "", fill: "none",
      stroke: "url(#usageRidgeStroke)", "stroke-width": "3",
      "stroke-linecap": "round", filter: "url(#usageGlow)", opacity: "0.55",
    });
    const ridge = svg("path", {
      class: "usage-ridge", d: "", fill: "none",
      stroke: "url(#usageRidgeStroke)", "stroke-width": "2.6",
      "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: "1",
    });

    const dots = svg("g", { class: "usage-dots" });
    const labels = svg("g", { class: "usage-labels" });

    const cursor = svg("g", { class: "usage-cursor", opacity: "0" });
    const cursorLine = svg("line", {
      class: "usage-cursor-line", x1: 0, y1: PLOT.y0 - 10, x2: 0, y2: PLOT.y1,
    });
    const cursorHalo = svg("circle", { class: "usage-cursor-halo", r: "11", cx: 0, cy: 0 });
    const cursorDot = svg("circle", { class: "usage-cursor-dot", r: "4.5", cx: 0, cy: 0 });
    cursor.append(cursorLine, cursorHalo, cursorDot);

    // One transparent rectangle takes every pointer event, so hit-testing does
    // not depend on landing on a 4px dot.
    const capture = svg("rect", {
      class: "usage-capture",
      x: PLOT.x0 - 6, y: PLOT.y0 - 16,
      width: PLOT.x1 - PLOT.x0 + 12, height: PLOT.y1 - PLOT.y0 + 26,
      fill: "transparent",
    });

    root.append(grid, gridLabels, baseline, beamRect, area, ridgeGlow, ridge, dots, labels, cursor, capture);
    return {
      svg: root, grid, gridLabels, area, ridge, ridgeGlow, dots, labels,
      cursor, cursorLine, cursorHalo, cursorDot, beamRect, capture,
    };
  }

  // --- data shaping ------------------------------------------------------

  /**
   * Both views out of the same rows: Today reads the 24 hourly buckets, This
   * week reads seven daily totals. The chart does not care which it is given —
   * a list of points, a max, and labels.
   */
  function buildSeries(days) {
    const todayRow = days[days.length - 1];
    const weekRows = days.slice(-7);
    const prevWeekRows = days.slice(-14, -7);
    const yesterday = days[days.length - 2];

    if (period === "today") {
      const now = new Date();
      const currentHour = now.getHours();
      return {
        points: todayRow.hours.map((ms, hour) => ({
          value: ms,
          short: hour % 6 === 0 ? fmtHour(hour) : "",
          long: fmtHour(hour),
          isNow: hour === currentHour,
        })),
        merged: { total: todayRow.total, domains: todayRow.domains, hours: todayRow.hours },
        previous: yesterday ? yesterday.total : 0,
        previousLabel: "yesterday",
        periodLabel: "today",
      };
    }

    const merged = mergeDays(weekRows);
    const todayKey = todayRow.date;
    return {
      points: weekRows.map((row) => {
        const date = new Date(`${row.date}T00:00:00`);
        const isToday = row.date === todayKey;
        return {
          value: row.total,
          short: fmtWeekday(date),
          long: fmtLongDay(date, isToday),
          isNow: isToday,
        };
      }),
      merged,
      previous: mergeDays(prevWeekRows).total,
      previousLabel: "the week before",
      periodLabel: "this week",
    };
  }

  // --- painting ----------------------------------------------------------

  function paintGrid(ticks, max) {
    chart.grid.textContent = "";
    chart.gridLabels.textContent = "";
    ticks.forEach((value, i) => {
      const y = yAt(value, max);
      const line = svg("line", {
        class: "usage-gridline", x1: PLOT.x0, x2: PLOT.x1, y1: y, y2: y,
      });
      line.style.setProperty("--i", String(i + 1));
      chart.grid.append(line);

      // In the right gutter, vertically centred on its own line.
      const label = svg("text", {
        class: "usage-gridlabel",
        x: PLOT.x1 + 10, y: y + 3.5, "text-anchor": "start",
      });
      label.textContent = fmtTick(value);
      label.style.setProperty("--i", String(i + 1));
      chart.gridLabels.append(label);
    });
  }

  function paintPoints(points, max) {
    chart.dots.textContent = "";
    chart.labels.textContent = "";

    const count = points.length;
    // At 24 hourly points a dot on every one is noise; mark only the peaks and
    // the current hour. At 7 daily points every day earns a dot.
    const peak = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);
    const showAll = count <= 12;

    points.forEach((point, index) => {
      const x = xAt(index, count);

      if (showAll || index === peak || (point.isNow && point.value > 0)) {
        const dot = svg("circle", {
          class: `usage-dot${point.isNow ? " is-now" : ""}${index === peak && point.value > 0 ? " is-peak" : ""}`,
          cx: x, cy: yAt(point.value, max), r: point.isNow ? 4.6 : 3.6,
        });
        dot.style.setProperty("--i", String(index));
        chart.dots.append(dot);

        // The live bucket gets a breathing halo — the one thing on the chart
        // that is still moving.
        if (point.isNow && point.value > 0) {
          const halo = svg("circle", {
            class: "usage-now-halo", cx: x, cy: yAt(point.value, max), r: "4.6",
          });
          chart.dots.append(halo);
        }
      }

      if (point.short) {
        const label = svg("text", {
          class: `usage-axislabel${point.isNow ? " is-now" : ""}`,
          x, y: H - 12, "text-anchor": "middle",
        });
        label.textContent = point.short;
        label.style.setProperty("--i", String(index));
        chart.labels.append(label);
      }
    });
  }

  function paintRidge(samples, max) {
    const d = ridgePath(samples, max);
    chart.ridge.setAttribute("d", d);
    chart.ridgeGlow.setAttribute("d", d);
    chart.area.setAttribute("d", areaPath(samples, max));
  }

  // --- the ring + site list ----------------------------------------------

  function buildSlices(domains, total) {
    const ranked = rankDomains(domains);
    const top = ranked.slice(0, TOP_SITES);
    const rest = ranked.slice(TOP_SITES);
    const slices = top.map((entry, index) => ({
      key: entry.domain,
      label: domainLabel(entry.domain),
      ms: entry.ms,
      color: SITE_COLORS[index] || REST_COLOR,
      share: total > 0 ? entry.ms / total : 0,
    }));
    if (rest.length > 0) {
      const ms = rest.reduce((sum, entry) => sum + entry.ms, 0);
      if (ms > 0) {
        slices.push({
          key: "__rest__",
          label: `${rest.length} other site${rest.length === 1 ? "" : "s"}`,
          ms,
          color: REST_COLOR,
          share: total > 0 ? ms / total : 0,
        });
      }
    }
    return slices;
  }

  function paintRing(slices, total, animate) {
    if (!ringHost) return null;
    ringHost.textContent = "";

    const size = 132;
    const cx = size / 2;
    const cy = size / 2;
    const r = 52;
    const circumference = 2 * Math.PI * r;
    const gap = slices.length > 1 ? 3.5 : 0;

    const root = svg("svg", {
      viewBox: `0 0 ${size} ${size}`, class: "usage-ring-svg", "aria-hidden": "true",
    });

    // A faint full circle underneath, so a quiet day still reads as a ring.
    root.append(svg("circle", {
      class: "usage-ring-track", cx, cy, r, fill: "none", "stroke-width": "13",
    }));

    const group = svg("g", { transform: `rotate(-90 ${cx} ${cy})` });
    const arcs = [];
    let offset = 0;

    slices.forEach((slice, index) => {
      const length = Math.max(0, slice.share * circumference - gap);
      const arc = svg("circle", {
        class: "usage-arc", cx, cy, r, fill: "none",
        stroke: slice.color, "stroke-width": "13", "stroke-linecap": "round",
        "stroke-dasharray": `${length} ${circumference - length}`,
        "stroke-dashoffset": String(-offset),
      });
      arc.style.setProperty("--i", String(index));
      // Store where the arc sits so hovering can lift it outward along its own
      // mid-angle instead of in one shared direction.
      const midAngle = ((offset + length / 2) / circumference) * 2 * Math.PI - Math.PI / 2;
      arc.dataset.key = slice.key;
      arc.style.setProperty("--lift-x", `${Math.cos(midAngle) * 3}px`);
      arc.style.setProperty("--lift-y", `${Math.sin(midAngle) * 3}px`);
      group.append(arc);
      arcs.push(arc);
      offset += slice.share * circumference;
    });

    root.append(group);
    ringHost.append(root);

    const center = el("div", "usage-ring-center");
    const kicker = el("div", "usage-ring-kicker", "Most used");
    const name = el("div", "usage-ring-name", slices[0] ? slices[0].label : "Nothing yet");
    const share = el(
      "div",
      "usage-ring-share",
      slices[0] ? `${Math.round(slices[0].share * 100)}% of ${fmtDuration(total)}` : ""
    );
    center.append(kicker, name, share);
    ringHost.append(center);

    if (animate && !reducedMotion()) {
      // Sweep each arc in from nothing, staggered, so the ring assembles.
      // The opacity goes along for the ride because a zero-length dash with a
      // round cap still paints a dot, and five stray dots on the track is not
      // what the first frame of this should look like.
      for (const arc of arcs) {
        const target = arc.getAttribute("stroke-dasharray");
        arc.setAttribute("stroke-dasharray", `0 ${circumference}`);
        arc.style.opacity = "0";
        requestAnimationFrame(() => {
          arc.classList.add("is-sweeping");
          arc.setAttribute("stroke-dasharray", target);
          arc.style.opacity = "";
        });
      }
    }

    return { arcs, kicker, name, share, total, slices };
  }

  function paintSites(slices, total, animate, ring) {
    if (!sitesEl) return;
    sitesEl.textContent = "";
    const max = slices.reduce((best, slice) => Math.max(best, slice.ms), 0);

    slices.forEach((slice, index) => {
      const row = el("div", "usage-site");
      row.dataset.key = slice.key;
      row.style.setProperty("--i", String(index));
      row.style.setProperty("--site-color", slice.color);

      // The tail row is a count, not a name, so it gets a plus rather than a
      // digit standing in for an initial.
      const glyph = slice.key === "__rest__" ? "+" : slice.label.charAt(0).toUpperCase();
      const tile = el("span", "usage-site-tile", glyph);
      const main = el("div", "usage-site-main");
      const name = el("span", "usage-site-name", slice.label);
      const barWrap = el("span", "usage-site-bar");
      const bar = el("span", "usage-site-bar-fill");
      const width = max > 0 ? Math.max(3, Math.round((slice.ms / max) * 100)) : 0;
      bar.style.width = animate && !reducedMotion() ? "0%" : `${width}%`;
      barWrap.append(bar);
      main.append(name, barWrap);

      const value = el("span", "usage-site-value", fmtDuration(slice.ms));
      row.append(tile, main, value);
      sitesEl.append(row);

      if (animate && !reducedMotion()) {
        requestAnimationFrame(() => {
          bar.style.width = `${width}%`;
        });
      }

      // The list and the ring are one component: hovering either focuses both,
      // and the ring centre reads out whatever is focused.
      const focus = () => setFocusedSlice(slice.key, ring, slices, total);
      const blur = () => setFocusedSlice(null, ring, slices, total);
      row.addEventListener("pointerenter", focus);
      row.addEventListener("pointerleave", blur);
      row.addEventListener("focus", focus);
      row.addEventListener("blur", blur);
      row.tabIndex = 0;
    });

    for (const arc of ring?.arcs || []) {
      arc.addEventListener("pointerenter", () =>
        setFocusedSlice(arc.dataset.key, ring, slices, total)
      );
      arc.addEventListener("pointerleave", () => setFocusedSlice(null, ring, slices, total));
    }
  }

  function setFocusedSlice(key, ring, slices, total) {
    for (const row of sitesEl?.children || []) {
      row.classList.toggle("is-focused", key != null && row.dataset.key === key);
      row.classList.toggle("is-dimmed", key != null && row.dataset.key !== key);
    }
    for (const arc of ring?.arcs || []) {
      arc.classList.toggle("is-focused", key != null && arc.dataset.key === key);
      arc.classList.toggle("is-dimmed", key != null && arc.dataset.key !== key);
    }
    if (!ring) return;
    const slice = key ? slices.find((s) => s.key === key) : slices[0];
    if (!slice) return;
    ring.kicker.textContent = key ? "Selected" : "Most used";
    ring.name.textContent = slice.label;
    ring.share.textContent = `${Math.round(slice.share * 100)}% of ${fmtDuration(total)}`;
  }

  // --- hero --------------------------------------------------------------

  function paintHero(series, animate) {
    const total = series.merged.total;

    // Count up from what was on screen, so a live update ticks rather than jumps.
    cancelNumberTween();
    const from = animate ? shownTotal : total;
    cancelNumberTween = tween(animate ? 780 : 0, (t) => {
      const value = from + (total - from) * t;
      if (!heroTotal) return;
      heroTotal.textContent = "";
      for (const part of fmtDurationParts(value)) {
        heroTotal.append(
          el("span", "usage-total-value", part.value),
          el("span", "usage-total-unit", part.unit)
        );
      }
    });
    shownTotal = total;

    // Down is the good direction for screen time, so the pill is green when
    // the number falls and amber when it climbs.
    if (heroDelta) {
      const previous = series.previous;
      if (previous > 0 && total > 0) {
        const change = ((total - previous) / previous) * 100;
        const rounded = Math.round(Math.abs(change));
        if (rounded < 1) {
          heroDelta.hidden = false;
          heroDelta.className = "usage-delta is-flat";
          heroDelta.textContent = `About the same as ${series.previousLabel}`;
        } else {
          const down = change < 0;
          heroDelta.hidden = false;
          heroDelta.className = `usage-delta ${down ? "is-down" : "is-up"}`;
          heroDelta.textContent = `${down ? "↓" : "↑"} ${rounded}% ${
            down ? "less" : "more"
          } than ${series.previousLabel}`;
        }
      } else {
        heroDelta.hidden = true;
      }
    }

    if (heroSub) {
      const siteCount = Object.keys(series.merged.domains).length;
      if (total <= 0) {
        heroSub.textContent = "";
      } else {
        const hours = series.merged.hours;
        const peakHour = hours.reduce((best, ms, i) => (ms > hours[best] ? i : best), 0);
        const bits = [
          `across ${siteCount} site${siteCount === 1 ? "" : "s"}`,
          `busiest around ${fmtHour(peakHour)}`,
        ];
        if (period === "week") {
          const active = series.points.filter((p) => p.value > 0).length || 1;
          bits.push(`${fmtDuration(total / active)} a day on the days you browsed`);
        }
        heroSub.textContent = `${series.periodLabel} — ${bits.join(" · ")}`;
      }
    }
  }

  // --- cursor ------------------------------------------------------------

  let focusedIndex = -1;
  let activePoints = [];
  let activeMax = TICK_LADDER[0];

  function moveCursor(index) {
    if (!activePoints.length || index < 0 || index >= activePoints.length) return;
    focusedIndex = index;
    const point = activePoints[index];
    const x = xAt(index, activePoints.length);
    const y = yAt(point.value, activeMax);

    chart.cursor.setAttribute("opacity", "1");
    chart.cursorLine.setAttribute("x1", String(x));
    chart.cursorLine.setAttribute("x2", String(x));
    chart.cursorHalo.setAttribute("cx", String(x));
    chart.cursorHalo.setAttribute("cy", String(y));
    chart.cursorDot.setAttribute("cx", String(x));
    chart.cursorDot.setAttribute("cy", String(y));
    chart.beamRect.setAttribute("x", String(x - 23));
    chart.beamRect.setAttribute("opacity", "1");

    // A reading near the top of the plot would push the chip off the plate, so
    // there it flips under the point instead of above it.
    tooltip.classList.toggle("is-below", y < H * 0.4);

    tooltip.hidden = false;
    tooltip.textContent = "";
    tooltip.append(
      el("span", "usage-tip-label", point.long),
      el("span", "usage-tip-value", fmtDuration(point.value))
    );

    // Position in real pixels and keep the whole chip inside the plate, so an
    // edge reading never hangs off the card.
    if (plate) {
      const plateWidth = plate.clientWidth || 1;
      const tipWidth = tooltip.offsetWidth || 0;
      const centre = (x / W) * plateWidth;
      const left = clamp(centre, tipWidth / 2 + 6, plateWidth - tipWidth / 2 - 6);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${(y / H) * (plate.clientHeight || 1)}px`;
    }

    if (srEl) srEl.textContent = `${point.long}: ${fmtDuration(point.value)}`;
  }

  function hideCursor() {
    focusedIndex = -1;
    chart.cursor.setAttribute("opacity", "0");
    chart.beamRect.setAttribute("opacity", "0");
    tooltip.hidden = true;
  }

  function indexFromClientX(clientX) {
    const rect = chart.svg.getBoundingClientRect();
    if (!rect.width) return -1;
    const vx = ((clientX - rect.left) / rect.width) * W;
    const frac = (vx - PLOT.x0) / (PLOT.x1 - PLOT.x0);
    return Math.round(clamp(frac, 0, 1) * (activePoints.length - 1));
  }

  chart.capture.addEventListener("pointermove", (event) => {
    const index = indexFromClientX(event.clientX);
    if (index >= 0 && index !== focusedIndex) moveCursor(index);
  });
  chart.capture.addEventListener("pointerleave", hideCursor);
  chart.capture.addEventListener("pointerdown", (event) => {
    const index = indexFromClientX(event.clientX);
    if (index >= 0) moveCursor(index);
  });

  // The chart is readable from the keyboard too: focus the plate and walk it.
  if (plate) {
    plate.tabIndex = 0;
    plate.setAttribute("role", "group");
    plate.setAttribute("aria-label", "Screen time chart — use the arrow keys to read each point");
    plate.addEventListener("keydown", (event) => {
      if (!activePoints.length) return;
      const start = focusedIndex < 0 ? activePoints.length - 1 : focusedIndex;
      let next = null;
      if (event.key === "ArrowRight") next = Math.min(activePoints.length - 1, start + 1);
      else if (event.key === "ArrowLeft") next = Math.max(0, start - 1);
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = activePoints.length - 1;
      else if (event.key === "Escape") {
        hideCursor();
        return;
      }
      if (next == null) return;
      event.preventDefault();
      moveCursor(next);
    });
    plate.addEventListener("blur", hideCursor);
  }

  // --- render ------------------------------------------------------------

  async function render({ animate }) {
    if (!enabled) return;

    // Bank the minutes spent getting here, so "today" includes them.
    try {
      await chrome.runtime.sendMessage({ type: "SIEVE_USAGE_FLUSH" });
    } catch {
      /* worker asleep or busy — the stored total is still correct, just older */
    }

    const days = await getUsageDays(14); // 7 shown + 7 for the comparison
    const series = buildSeries(days);
    const total = series.merged.total;
    const { axisMax: max, ticks } = computeTicks(
      Math.max(...series.points.map((p) => p.value), 1)
    );

    activePoints = series.points;
    activeMax = max;
    hideCursor();

    if (emptyEl) emptyEl.hidden = total > 0;
    chart.svg.classList.toggle("is-empty", total <= 0);
    chart.svg.setAttribute(
      "aria-label",
      total > 0
        ? `Screen time ${series.periodLabel}: ${fmtDuration(total)}`
        : `No screen time measured ${series.periodLabel} yet`
    );

    paintGrid(ticks, max);
    paintPoints(series.points, max);
    paintHero(series, animate);

    const slices = buildSlices(series.merged.domains, total);
    const ring = paintRing(slices, total, animate);
    paintSites(slices, total, animate, ring);
    // With nothing measured, the empty plate says so once; a hollow ring and an
    // empty list underneath would just repeat it in a less useful way.
    if (splitEl) splitEl.hidden = total <= 0;
    if (sitesEl) sitesEl.hidden = slices.length === 0;

    // The ridge itself: draw it on the first time, morph it after that.
    const target = resample(series.points.map((p) => p.value));
    cancelRidgeTween();

    if (!hasRendered || reducedMotion()) {
      shownSamples = target;
      shownMax = max;
      paintRidge(shownSamples, shownMax);
      if (!reducedMotion()) runEntrance();
    } else {
      const from = shownSamples;
      const fromMax = shownMax;
      cancelRidgeTween = tween(620, (t) => {
        const frame = new Array(SAMPLES);
        for (let i = 0; i < SAMPLES; i++) {
          frame[i] = from[i] + (target[i] - from[i]) * t;
        }
        paintRidge(frame, fromMax + (max - fromMax) * t);
        if (t === 1) {
          shownSamples = target;
          shownMax = max;
        }
      });
    }

    if (srEl && total > 0) {
      const readings = series.points
        .filter((p) => p.value > 0)
        .map((p) => `${p.long} ${fmtDuration(p.value)}`)
        .join(", ");
      srEl.textContent = `Screen time ${series.periodLabel}: ${fmtDuration(total)}. ${readings}`;
    }

    hasRendered = true;
  }

  // The one-off reveal: the line draws itself, the fill rises under it, then
  // the dots and labels arrive. Done by toggling a class so the timing curves
  // live in the stylesheet with the rest of the page.
  function runEntrance() {
    chart.svg.classList.remove("is-entered");
    chart.svg.classList.add("is-entering");
    // Force a reflow so the browser has the "before" state to animate from.
    void chart.svg.getBoundingClientRect();
    requestAnimationFrame(() => {
      chart.svg.classList.remove("is-entering");
      chart.svg.classList.add("is-entered");
    });
  }

  // --- tabs --------------------------------------------------------------

  tabsEl?.addEventListener("click", (event) => {
    const button = event.target.closest(".usage-tab");
    if (!button || button.dataset.period === period) return;
    period = button.dataset.period;
    for (const tab of tabsEl.querySelectorAll(".usage-tab")) {
      const active = tab.dataset.period === period;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    }
    render({ animate: false });
  });

  // --- live updates ------------------------------------------------------

  // The tracker writes every minute while the browser is in use. Redraw softly
  // (no entrance, values tween) and not more than once every few seconds.
  let refreshTimer = 0;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !enabled) return;
    if (!changes.sieveUsage) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => render({ animate: false }), 2500);
  });

  if (enabled) await render({ animate: true });
}
