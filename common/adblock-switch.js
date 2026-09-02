// common/adblock-switch.js
// Sieve — the shared "adopt the Ad & Trackers switch" rule.
//
// ---------------------------------------------------------------------------
// WHAT THIS SOLVES
//
// The settings page shows ONE switch over several independent storage keys, and
// it draws that switch as on if ANY of them is on. Every time a new mechanism
// joins the suite, its key starts life ABSENT on the profiles that already have
// the switch turned on — so the switch says on while the new mechanism never
// runs, and there is nothing in the UI that could explain the difference. Each
// module therefore adopts the switch's state once, the first time it ever sees
// storage.
//
// ABSENCE is the test, not falseness. chrome.storage.local.get returns {} for a
// key that was never written, and that is the only thing separating "has not
// heard of this yet" from "turned it off on purpose". One shot — the write is
// what stops it happening again.
//
// ---------------------------------------------------------------------------
// WHY IT IS HERE RATHER THAN IN EACH MODULE
//
// background/anti-adblock.js and background/ad-slot-collapse.js each carried a
// near-copy, deliberately, so that those modules would stay independent of one
// another the way the DNR tiers do. Both copies carried a note saying a third
// should become one, and writing that third is what prompted this file.
//
// The feature that was going to be the third — the floating-video un-sticker —
// then moved to a switch of its own and stopped needing to adopt anything at
// all, so there are two callers again. This stayed anyway, for a reason that
// has nothing to do with the count: putting the two copies side by side showed
// they had already DRIFTED. Each carried its own hand-written list of the OTHER
// keys in the switch, and anti-adblock's predated the slot collapser, so a
// profile whose only enabled mechanism was the collapser would never have
// adopted. Going back to two copies would mean choosing to reintroduce that.
//
// The list below is therefore the whole switch, with the key being adopted
// filtered out of its own comparison. That makes this exactly the test the
// settings page makes when it decides whether to draw the switch as on
// (ADBLOCK_KEYS.some, options/options.js) — the only definition of "on" a user
// can actually see, and so the only one worth adopting from.

// Every key behind the single Ad & Trackers switch. Must stay in step with
// ADBLOCK_KEYS in options/options.js.
//
// ssFloatVideoEnabled is deliberately NOT here. It sits in the same section of
// the settings page but has its own switch, so there is no shared state for it
// to adopt and it must not be read as evidence that the shared one is on.
export const ADBLOCK_SWITCH_KEYS = [
  "ssAdTrackerEnabled",
  "ssAdNetworkEnabled",
  "ssYouTubeAdsEnabled",
  "ssFacebookAdsEnabled",
  "ssAntiAdblockEnabled",
  "ssAdSlotCollapseEnabled",
];

/**
 * Turn `key` on once, and only once, if the user has the Ad & Trackers switch
 * on but has never been asked about this particular key.
 *
 * @param {string} key    the storage key this module owns
 * @param {string} label  what to call the module in the log line
 * @returns {Promise<boolean>} true if it adopted (and therefore wrote)
 */
export async function adoptAdblockSwitchState(key, label) {
  const stored = await chrome.storage.local.get(key);
  if (Object.prototype.hasOwnProperty.call(stored, key)) return false;

  const siblingKeys = ADBLOCK_SWITCH_KEYS.filter((k) => k !== key);
  const siblings = await chrome.storage.local.get(siblingKeys);
  if (!siblingKeys.some((k) => siblings[k])) return false;

  // The write fires storage.onChanged, which runs each module's own reconcile.
  // This deliberately registers nothing itself.
  await chrome.storage.local.set({ [key]: true });
  console.log(`[Sieve] ${label} adopted the existing Ad & Trackers switch state.`);
  return true;
}
