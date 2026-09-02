# SABR / UMP ad removal — feasibility investigation

**Date:** 2 September 2026 · **Status:** BUILT — shipped as Route 3 in `content/youtube-ads.js`
**Question asked:** can YouTube's server-side video ads be removed client-side?
**Short answer:** yes. Not by rewriting the stream, which was the obvious idea and
the wrong one, but by reading it to notice the ad and then seeking past it.

---

## Why this exists

1.4.0's YouTube filter removes ads by deleting them from YouTube's JSON before
the player reads it. A user reported ads surviving it. Their diagnostic showed
every counter healthy — `adPlacements` removed, `fetchUnreadable: 0` — and an ad
playing anyway, with `serverAbrStreamingUrl` present and **zero of 26 formats
carrying a URL**.

That is SABR: the player no longer fetches named files, it POSTs to one endpoint
asking "what's next?" and the server returns whatever segments it chooses. The ad
decision moved from client-side data we can edit to a server-side choice.

The initial read was that this is unreachable. That read was **too pessimistic**,
and this note records why.

---

## What was measured

Live `youtube.com/watch`, headless Chrome, PH exit. Reproduced real ad delivery —
different advertisers on every run (McDo PH, foodpanda PH, Charmee), so this is
genuine ad serving and not a fixture.

### 1. The container is parseable, and re-serialisable byte-exact

`POST /videoplayback?sabr=1` → `Content-Type: application/vnd.yt-ump`, responses
of 130 B to 1.3 MB. UMP is a flat sequence of `[varint type][varint size][bytes]`.

A ~40-line parser decoded **every** captured response with the parts tiling the
buffer exactly — no desync, no errors. A matching writer reproduced untouched
responses **byte for byte** (`roundTripByteExact: true`). Both parser and writer
are therefore correct, which was the first thing worth knowing.

Part types seen in normal playback:

```
47 PLAYBACK_START_POLICY   58 STREAM_PROTECTION_STATUS   52 REQUEST_IDENTIFIER
53 REQUEST_CANCELLATION    35 NEXT_REQUEST_POLICY        42 FORMAT_INIT_METADATA
20 MEDIA_HEADER            21 MEDIA                      22 MEDIA_END

typical body:  47 58 52 53 35 42 | 20:52 21:631 22:1 | 20:71 21:32769 … 22:1
```

### 2. Ads are trivially identifiable — no media decoding required

`MEDIA_HEADER` (type 20, 52–103 bytes) is a protobuf whose **field 2 is the
11-character video id that the following media belongs to**:

```
field 1  sequence      field 2  VIDEO ID  ← this one
field 3  itag          field 4  lmt
field 6  start range   field 12 duration_ms      field 14 content_length
```

Requesting `dQw4w9WgXcQ` produced this session:

| response | media owner | bytes |
|---|---|---|
| 1 | (control only) | — |
| 2 | `CriVUbddqX0` — foodpanda PH | 322 KB |
| 3 | `QnlpRkv6okI` — Charmee | 314 KB |
| 4 | `dQw4w9WgXcQ` — the video | 1281 KB |
| 6 | `dQw4w9WgXcQ` — the video | 921 KB |

**Ad media and content media arrive in separate responses, each tagged with its
owner.** Telling them apart is an 11-character string comparison against
`location.search`'s `v`. That is far cheaper than the frame-level analysis this
was assumed to need.

### 3. Removing the ad does NOT break playback — but the prototype is wasteful

Prototype: parse each UMP response, drop `20/21/22` triplets whose header names a
video other than the requested one, re-serialise. Result:

```
t=0.0s  dur=6.0s    readyState=0  adShowing=true     ← stalled on the removed ad
t=0.0s  dur=6.0s    readyState=0  adShowing=true
t=4.2s  dur=213.1s  readyState=4  adShowing=false    ← recovered, real video playing
                    umpSeen=83  rewritten=80  dropped=15.44MB  kept=1.45MB
```

The video **did** play, at full 213 s duration, no media error. So this is not a
dead end. But:

- **~17 s stall** before the player gave up on the ad and advanced. Replacing a
  6 s ad with a 17 s freeze is worse than the ad.
- **15.44 MB downloaded and discarded** against 1.45 MB kept. The server kept
  re-sending media the client never acknowledged consuming.

Both symptoms are the same root cause: deleting the bytes does not tell the
player or the server that the ad is over. The client keeps asking, the server
keeps sending.

---

## Where the remaining work was — and why this route was abandoned

Not in parsing; that is solved and proven. The open problem was **making the
player advance past an ad whose media it will never receive.** Options considered:

1. **Rewrite rather than delete.** `MEDIA_HEADER` carries `duration_ms` (field
   12) and a time range (field 15). Presenting the ad as a zero-length or
   already-complete segment may let the player finish it instantly instead of
   waiting. Most promising, most surgical.
2. **Forge completion.** Emit `MEDIA_END` (22) for the ad's sequence without the
   payload, so the player believes the segment arrived.
3. **Fix the request side.** The client's POST body (~2 KB protobuf) reports what
   it has buffered. Left untouched it re-requests the dropped media, which is
   where the 15 MB goes. Any real fix has to edit this too.

None of these were built. Seeking the ad to its end (see Outcome) makes the whole
question moot: the ad is allowed to arrive and is simply skipped, so the player is
never left waiting and the server is never desynced.

---

## Outcome — built, by a different route than this note first proposed

The recommendation here was originally "do not ship". That was reversed, and the
reason is worth recording: **rewriting the stream was the wrong target.**

Removing ad segments means the player waits for media that never comes (the 17 s
stall above). But the ad plays as its OWN playback with its own duration, so it
does not need removing — it can simply be **seeked to its end**, and the player
advances by itself. Confirmed on live ads: 6.04 s and 15.12 s ad playbacks both
seeked successfully, after which the real 213 s video played.

So the shipped design reads the stream and never writes to it:

```
UMP response --> parse --> MEDIA_HEADER field 2 --> id != address bar's v ?
                                                     |
                       (and the player duration disagrees with the real length)
                                                     |
                                          video.currentTime = duration - 0.05
```

That inverts the risk that made this look unshippable. Nothing is rewritten, so a
parser bug cannot corrupt media — the worst case is an unrecognised ad, which is
how the rest of the file already fails. The response object handed back is the
identical object, asserted in the tests.

**Two signals are required**, because a false positive seeks the user's real
video to its end. An early prototype using duration alone did exactly that, on a
213-second video, when a stale global made it look like an ad. Both the mismatch
and the duration disagreement must hold, and an unknown real duration means
decline.

### What is proven, and what is not

| | |
|---|---|
| UMP parses, round-trips byte-exact | measured, every response |
| `MEDIA_HEADER` field 2 identifies ads | 3 advertisers, 3 sessions |
| Seeking clears a live SABR ad | measured: 6.04 s and 15.12 s ads |
| No regression to playback | 6 live sessions, full durations, `readyState 4`, no media error |
| Guards reject false positives | 6 unit tests incl. normal playback and prefetch |
| **The shipped guarded path firing on a live ad** | **CONFIRMED in the field** — see below |

Headless testing could not confirm this — YouTube stops serving ads to those
sessions after a few runs and delivery cannot be forced. It was confirmed instead
from a real logged-in session, which reported:

```
sabrSeen: 6          the session was on server-side delivery
sabrResponses: 47    media stream read, no errors
sabrAdsSkipped: 2    two server-side ads detected and skipped
adSlotRenderer: 8    display ads removed by the JSON layer
fetchUnreadable: 0   nothing unparseable
```

Both layers therefore work together on a live session: the JSON layer removes
what is in the page data, and Route 3 skips what only exists in the stream.

### Still untested

Mid-rolls, live streams, seeking while an ad is queued, multi-audio. The guards
decline rather than guess, so the expected failure is an ad that plays.

## Reproducing

Prototype scripts (parser, writer, filter, CDP harness) are in the session
scratchpad, not the repo — they are throwaway research, not code to maintain.
The method: inject a `fetch` wrapper via `Page.addScriptToEvaluateOnNewDocument`,
match `/videoplayback` with `sabr=1`, `clone().arrayBuffer()`, parse, compare
`MEDIA_HEADER` field 2 against the `v` parameter.
