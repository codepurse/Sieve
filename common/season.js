// common/season.js
// Sieve — Christmas: when it shows, and what the person chose.
//
// By itself it comes on on 1 December and goes on 2 January, by the
// computer's own clock, without anyone touching it. The switch in Settings ›
// Advanced › Appearance (and the popup's "Turn off Christmas") can also force
// it: on, to have it sooner, or off, to skip it. A forced choice belongs to one
// Christmas, so it never outlives it: turned on in November, it still packs
// itself away on 2 January; turned off in December, it comes back next
// 1 December. Nothing kept means "follow the calendar". common/christmas.js
// draws it; this file only decides, so the tests can ask it about any date.

(() => {
  "use strict";

  if (window.SieveSeason) return;

  // A forced choice, { on, season }, or null to follow the calendar.
  const KEY = "uiChristmas";
  // The copy each page reads before its first paint, as theme.js keeps one for
  // the theme: chrome.storage answers too late to make room for the lights.
  const CACHE_KEY = "sieve.uiChristmas";

  function asDate(date) {
    return date && typeof date.getMonth === "function" ? date : new Date();
  }

  // 1 December to 1 January, both days included, in local time.
  function inSeason(date) {
    const d = asDate(date);
    const month = d.getMonth();
    return month === 11 || (month === 0 && d.getDate() === 1);
  }

  // The Christmas a day belongs to: the one coming, or the one being had.
  // New Year's Day still belongs to the year before's.
  function seasonOf(date) {
    const d = asDate(date);
    return d.getMonth() === 0 && d.getDate() === 1 ? d.getFullYear() - 1 : d.getFullYear();
  }

  // A kept choice, or null for anything that isn't one.
  function normalize(value) {
    if (!value || typeof value !== "object") return null;
    if (typeof value.on !== "boolean" || !Number.isInteger(value.season)) return null;
    return { on: value.on, season: value.season };
  }

  // Whether it shows on this day: a choice made for this Christmas, else the
  // calendar.
  function isOn(value, date) {
    const choice = normalize(value);
    if (choice && choice.season === seasonOf(date)) return choice.on;
    return inSeason(date);
  }

  // What to keep when the switch is set to `on` on this day. The same as the
  // calendar would say keeps nothing, so turning it on and off again to try it
  // in November still leaves 1 December to bring it.
  function choose(on, date) {
    return on === inSeason(date) ? null : { on: !!on, season: seasonOf(date) };
  }

  // The few words under the name in the popup.
  function line(date) {
    const d = asDate(date);
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    if (m === 0 && day === 1) return "Happy New Year";
    if (m === 11 && day === 24) return "Christmas Eve";
    if (m === 11 && day === 31) return "New Year’s Eve";
    if (m === 11 && day > 24) return "Merry Christmas";
    // Counted in calendar days, so a clock change in between can't make it 23.
    const days = Math.round((new Date(y, 11, 25) - new Date(y, m, day)) / 86400000);
    if (days > 1) return `${days} days to Christmas`;
    return "Merry Christmas";
  }

  window.SieveSeason = { KEY, CACHE_KEY, inSeason, seasonOf, normalize, isOn, choose, line };
})();
