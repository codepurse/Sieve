// test/season-test.mjs
// Sieve — Christmas: snow and lights from 1 December to 1 January.
//
// common/season.js decides when: by the calendar, or as the switch forced it
// for one Christmas; common/christmas.js draws it on the popup, the blocked
// page and Settings and nowhere else. These hold the dates (it has to come on
// 1 December and be gone on 2 January without anyone touching it), the switch,
// what a forced choice may and may not outlive, the words under the name, and the wiring: a
// page that loads the drawing before the season check, a website that runs a
// frame of it, or snow falling across the urge screen would each be a bug
// nobody sees until December.
//
//   node --test test/

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

function loadSeason() {
  const window = {};
  vm.runInNewContext(read("common/season.js"), { window });
  return window.SieveSeason;
}

const Season = loadSeason();
const on = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);
const head = (html) => html.slice(0, html.indexOf("</head>"));
const PAGES = ["popup/popup.html", "pages/blocked.html", "options/options.html"];

test("it shows from 1 December to 1 January, both days included", () => {
  assert.equal(Season.inSeason(on(2026, 11, 30, 23, 59)), false, "30 November is too early");
  assert.equal(Season.inSeason(on(2026, 12, 1, 0, 0)), true, "from the first minute of 1 December");
  assert.equal(Season.inSeason(on(2026, 12, 25)), true);
  assert.equal(Season.inSeason(on(2026, 12, 31, 23, 59)), true);
  assert.equal(Season.inSeason(on(2027, 1, 1, 0, 0)), true, "New Year’s Day still has it");
  assert.equal(Season.inSeason(on(2027, 1, 1, 23, 59)), true);
  assert.equal(Season.inSeason(on(2027, 1, 2, 0, 0)), false, "gone on 2 January by itself");
  assert.equal(Season.inSeason(on(2027, 7, 1)), false);
});

test("nothing kept follows the calendar: off until 1 December, then on by itself", () => {
  for (const nothing of [undefined, null, false, true, "on", {}, { on: "yes", season: 2026 }, { on: true, season: "2026" }]) {
    assert.equal(Season.normalize(nothing), null, `${JSON.stringify(nothing)} is not a choice`);
    assert.equal(Season.isOn(nothing, on(2026, 11, 2)), false, "off in November");
    assert.equal(Season.isOn(nothing, on(2026, 12, 1, 0, 0)), true, "on by itself on 1 December");
  }
});

test("each day belongs to one Christmas, and New Year’s Day to the one before", () => {
  assert.equal(Season.seasonOf(on(2026, 2, 14)), 2026);
  assert.equal(Season.seasonOf(on(2026, 11, 2)), 2026);
  assert.equal(Season.seasonOf(on(2026, 12, 31)), 2026);
  assert.equal(Season.seasonOf(on(2027, 1, 1, 23, 59)), 2026);
  assert.equal(Season.seasonOf(on(2027, 1, 2, 0, 0)), 2027);
});

test("switched on early, it shows at once, and still packs itself away on 2 January", () => {
  const choice = Season.choose(true, on(2026, 11, 2));
  assert.deepEqual({ ...choice }, { on: true, season: 2026 }); // a plain copy: the sandbox has its own Object
  assert.equal(Season.isOn(choice, on(2026, 11, 2)), true, "on now, in November");
  assert.equal(Season.isOn(choice, on(2026, 12, 20)), true, "and through Christmas");
  assert.equal(Season.isOn(choice, on(2027, 1, 1)), true);
  assert.equal(Season.isOn(choice, on(2027, 1, 2)), false, "gone on 2 January");
  assert.equal(Season.isOn(choice, on(2027, 6, 1)), false, "and it doesn't come back early next year");
  assert.equal(Season.isOn(choice, on(2027, 12, 1)), true, "next 1 December is the calendar's again");
});

test("switched off in December, it's off for this Christmas only", () => {
  const choice = Season.choose(false, on(2026, 12, 5));
  assert.deepEqual({ ...choice }, { on: false, season: 2026 });
  assert.equal(Season.isOn(choice, on(2026, 12, 25)), false);
  assert.equal(Season.isOn(choice, on(2027, 1, 1)), false, "New Year’s Day too");
  assert.equal(Season.isOn(choice, on(2027, 12, 1)), true, "back by itself next 1 December");
});

test("setting it to what the calendar says keeps nothing, so trying it never costs December", () => {
  assert.equal(Season.choose(false, on(2026, 11, 2)), null, "on then off again in November");
  assert.equal(Season.choose(true, on(2026, 12, 5)), null, "off then on again in December");
  assert.equal(Season.isOn(Season.choose(false, on(2026, 11, 2)), on(2026, 12, 1)), true, "1 December still brings it");
});

test("the words under the name count down to Christmas and see the year out", () => {
  assert.equal(Season.line(on(2026, 12, 1)), "24 days to Christmas");
  assert.equal(Season.line(on(2026, 12, 23, 23, 30)), "2 days to Christmas");
  assert.equal(Season.line(on(2026, 12, 24)), "Christmas Eve");
  assert.equal(Season.line(on(2026, 12, 25)), "Merry Christmas");
  assert.equal(Season.line(on(2026, 12, 30)), "Merry Christmas");
  assert.equal(Season.line(on(2026, 12, 31)), "New Year’s Eve");
  assert.equal(Season.line(on(2027, 1, 1)), "Happy New Year");
});

test("the choice is kept as Sieve keeps the theme: a storage key and a first-paint copy", () => {
  assert.equal(Season.KEY, "uiChristmas");
  assert.equal(Season.CACHE_KEY, "sieve.uiChristmas");
  const options = read("options/options.js");
  assert.match(options, /uiChristmas: null,/, "Settings reads it in its one batched read; nothing kept follows the calendar");
  assert.match(options, /setupChristmas\(store\);/);
  assert.match(options, /choice = S\.choose\(toggle\.checked, new Date\(\)\);/, "the switch keeps a choice for this Christmas");
  assert.match(options, /toggle\.checked = S\.isOn\(choice, new Date\(\)\);/, "and shows whether it is on now");
  assert.match(options, /localStorage\.setItem\(S\.CACHE_KEY, JSON\.stringify\(choice\)\)/, "and writes the copy the first paint reads");
});

test("the popup, the blocked page and Settings load the season check, then the drawing, in <head>", () => {
  for (const page of PAGES) {
    const top = head(read(page));
    const theme = top.indexOf('<script src="../common/theme.js"></script>');
    const season = top.indexOf('<script src="../common/season.js"></script>');
    const drawing = top.indexOf('<script src="../common/christmas.js"></script>');
    assert.ok(theme > -1 && season > theme, `${page} loads common/season.js in <head>, after the theme`);
    assert.ok(drawing > season, `${page} loads common/christmas.js after it, so <html> is marked before the first paint`);
    const all = read(page);
    assert.equal(all.split('<script src="../common/season.js">').length - 1, 1, `${page} loads the season check once`);
    assert.equal(all.split('<script src="../common/christmas.js">').length - 1, 1, `${page} loads the drawing once`);
  }
});

test("each page makes room for the lights only while it's Christmas", () => {
  assert.match(read("popup/popup.css"), /\.is-christmas \.topbar \{[^}]*padding-top:/, "the popup's name sits lower");
  assert.match(read("options/options.css"), /\.is-christmas \.main \{\s*padding-top: 104px;/, "Settings' column starts lower");
  assert.match(read("options/options.css"), /\.is-christmas \.sidebar \{\s*padding-top:/, "and the index, when it is a strip on top");
  assert.match(read("pages/blocked.html"), /\.is-christmas \.letterhead \{\s*padding-top:/, "the blocked page's letterhead starts lower");
});

test("no website ever runs it", () => {
  for (const file of ["manifest.json", "manifest.firefox.json"]) {
    const manifest = JSON.parse(read(file));
    const injected = (manifest.content_scripts || []).flatMap((c) => c.js || []);
    assert.ok(!injected.some((f) => /christmas|season/.test(f)), `${file}: not a content script`);
  }
  for (const dir of ["content", "background"]) {
    for (const name of fs.readdirSync(new URL(`../${dir}/`, import.meta.url))) {
      if (!name.endsWith(".js")) continue;
      assert.ok(!/christmas\.js|season\.js/.test(read(`${dir}/${name}`)), `${dir}/${name} never loads or injects it`);
    }
  }
  const code = read("common/christmas.js").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/https?:\/\//.test(code), "and it reaches nothing on the network");
});

test("the popup has a quick way to turn it off, on the same setting", () => {
  const popup = read("popup/popup.html");
  assert.match(
    popup,
    /<button type="button" class="season-line" id="season-line" aria-expanded="false" aria-controls="season-off" hidden><\/button>/,
    "the countdown words are a button that opens the line"
  );
  assert.match(popup, /id="season-off"[^>]*hidden>[^<]*<button type="button" class="link-btn" id="season-off-button">Turn off Christmas<\/button>/);
  const drawing = read("common/christmas.js");
  assert.match(drawing, /choice = Season\.choose\(false, now\);/, "off for this Christmas, as the Settings switch would keep it");
  assert.match(drawing, /store\.local\.set\(\{ \[Season\.KEY\]: choice \}\)/, "it writes the setting Settings reads");
  assert.match(drawing, /keepCopy\(choice\);/, "and the copy the first paint reads");
});

test("Settings has the switch all year, off until it's Christmas or switched on", () => {
  const html = read("options/options.html");
  assert.match(html, /<input type="checkbox" id="christmas-toggle" \/>/, "off in the markup; options.js shows whether it is on now");
  assert.match(html, /<div class="field" id="christmas-field">/, "shown all year, so it can be switched on early or off");
  assert.ok(!/christmas-field/.test(read("options/options.js") + read("common/christmas.js")), "and nothing hides it out of season");
  const appearance = html.slice(html.indexOf('id="appearance-card"'), html.indexOf("</section>", html.indexOf('id="appearance-card"')));
  assert.match(appearance, /id="christmas-toggle"/, "it lives with the theme, under Appearance");
  assert.ok(!/gateToggleOff[^\n]*christmas|christmas[^\n]*Guardian/i.test(read("options/options.js").replace(/^\s*\/\/.*$/gm, "")), "how pages look is never PIN-gated");
});

test("the urge screen keeps the blocked page to itself", () => {
  const drawing = read("common/christmas.js");
  assert.match(drawing, /html\.dataset\.urge === "on"/, "off while the urge screen leads the page");
  assert.match(drawing, /const on = !urging\(\) &&/);
  assert.match(drawing, /attributeFilter: \["data-urge"\]/, "and it notices when the urge screen arrives after the page has drawn");
});

test("Warden's Santa hat shows only at Christmas, and keeps still for reduced motion", () => {
  const html = read("options/options.html");
  const hats = html.match(/class="xmas-hat [^"]*"/g) || [];
  assert.deepEqual(hats, ['class="xmas-hat xmas-hat-dial"'], "one, on the dial");
  const dial = html.slice(html.indexOf('<svg class="warden-dial"'), html.indexOf("</svg>", html.indexOf('<svg class="warden-dial"')));
  assert.match(dial, /class="xmas-hat xmas-hat-dial"/, "drawn inside the dial, so it scales with it");
  const css = read("options/options.css");
  assert.match(css, /\.xmas-hat \{\s*display: none;\s*\}/, "hidden unless it is Christmas");
  assert.match(css, /\.is-christmas \.xmas-hat \{\s*display: inline;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.xmas-hat-pom \{\s*animation: none;/);
  const hatCss = css.slice(css.indexOf(".xmas-hat {"), css.indexOf("@keyframes xmas-hat-sway"));
  assert.ok(!/#[0-9a-f]{3,6}\b/i.test(hatCss), "the hat’s colours live in its SVG, not in page CSS");
  assert.ok(!/circles:/.test(read("common/christmas.js")), "the dial wears the hat, so no snow cap is drawn over it");
});
