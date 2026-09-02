// rules/noop.js
// Sieve — a script that does nothing, on purpose.
//
// Some ad-network URLs must not be BLOCKED, they must be answered with nothing.
// The difference matters: a blocked request fails with ERR_BLOCKED_BY_CLIENT,
// which the page can see and act on, while a request served this file succeeds
// with a valid, empty script. Same amount of advertising either way — no
// evidence left behind in the one case, a signed confession in the other.
//
// background/ad-tracker-blocker.js redirects a short, named list of
// adblock-detection probes here. See NEUTERED_STUBS there for which, and why
// each one earned an exception to a tier whose whole job is blocking.
//
// Deliberately empty. Anything at all in here could be detected in turn.
