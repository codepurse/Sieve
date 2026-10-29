# pro/

The files in this folder are empty stand-ins for **Sieve Pro**:

| File | The feature |
| --- | --- |
| `urge.js` | The urge screen, on the block page, and recording attempts for streaks |
| `streaks.js` | Streaks and money kept, and the habits the urge screen knows about |
| `settings.js` | The urge screen and streaks groups in Settings › Sieve Pro |
| `features.js` | Which Pro features a build carries (here: none) |

Sieve Pro is not open source. It lives in a separate, private repository and
is copied over these files when a store build is made (`build-chrome.ps1`,
`build-firefox.ps1`). The versions of Sieve on the Chrome Web Store, Microsoft
Edge Add-ons and Firefox Add-ons carry it.

**Every protection is open source and here**: every blocker and its lists,
the filters, the Dark Pattern Blocker, the Doomscroll Stopper, the Guardian
Lock, the cool-off, the Seal, and everything else that decides what is
blocked or guards your settings. A build
made from this repository protects exactly as the store version does. Without
Pro, Settings has no Sieve Pro section, and the block page is the plain notice.

So is the licence check (`common/pro.js`), the one network request Pro makes,
so anyone can see exactly what it sends. The Pro features themselves make no
network requests: what they keep stays on the device.
