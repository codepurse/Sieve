// ===========================================================================
// Sieve — release notes that ship inside the extension.
//
// Add a new entry at the TOP for each release and keep `version` in step with
// manifest.json: the matching entry gets the "Current" badge on the release
// notes page, and the sidebar shows a dot until those notes have been looked
// at. Nothing here is fetched, so an older install never advertises changes it
// doesn't actually have.
//
// Loaded as a plain script (no modules anywhere in this extension). A
// top-level `const` is shared across the classic scripts on a page, so
// pages/release-notes.js reads it by name.
// ===========================================================================

const SIEVE_CHANGELOG = [
  // UNRELEASED — manifest.json is still on 1.2.0, so this entry renders without
  // the "Current" badge until the version is bumped at release time. Fold these
  // notes into the release entry then, the way the 1.1.0 notes were folded in.
  {
    version: "1.3.0",
    date: "Unreleased",
    items: [
      "New Game Blocker in Site Blocking — four switches you can turn on separately: browser game portals (Poki, CrazyGames, CoolMathGames, and the big .io games), game download stores (Steam, Epic, GOG, itch.io, console storefronts), game platforms and online worlds (Roblox, Minecraft, Fortnite), and game streaming, cloud gaming and esports (Twitch, Kick, now.gg). All off by default.",
      "The game portal switch also blocks the shared host most portals serve their games from, so games embedded on other pages stop loading too.",
      "Game blocking is browser-only, and the settings page says so: Sieve can block game sites and store pages, but it cannot see or stop a game already installed on the computer, and nothing on a console. Blocking a store stops new games being browsed and bought.",
      "Blocked game sites get their own wording naming the switch to turn off, and the Allowlist and Guardian Lock work here exactly as they do everywhere else.",
      "New Usage Insights section — a screen-time report. It shows your total for today or the week, how it compares with the day or week before, a curve of your day hour by hour (or the week day by day), your busiest hour, and which sites took the time. Hover or use the arrow keys to read any point on the chart.",
      "Usage Insights is off until you switch it on, and it never leaves your device. It records site names and durations only — no URLs, no page content, nothing uploaded. Choose how long to keep it (7, 30 or 90 days) and clear it whenever you like.",
      "Only the tab you are actually looking at is counted, so two windows of the same site are never counted twice, and the clock stops when you switch to another app, lock the screen, or step away for a few minutes. Reading a long page still counts.",
      "The Doomscroll Stopper takes your own sites now. Type a domain under Focus and it gets its own row, its own daily time limit and the same pause screen as the built-in feeds. Subdomains are included, and tracking starts on tabs you already have open.",
      "Removing a site you added clears its limit and its history with it, so adding the same domain back later starts clean. Removing one asks for your lock, like every other change that weakens your protection.",
      "New Search Result Filter in Browsing — sort your search results before you click. Colour the sources you trust so they stand out, hide the ones you never want to see, and give each rule its own colour from a palette you choose. Works on Google, Bing and DuckDuckGo.",
      "Rules take the syntax you already know: example.com for a site and its subdomains, .edu for a whole domain ending, example.com/docs/* for one part of a site, or a /regex/. Pasting a list you keep elsewhere works as-is.",
      "Nothing disappears silently. Hidden results are counted under the search box with a link to show them, dimmed and outlined so they are never mistaken for normal results.",
      "Sites on your Blocked list are hidden from results too, since those links only lead to the blocked page. That can be switched off on its own.",
      "Every result Sieve touches now carries a small “?” you can click to see exactly which rule did it, what that rule did, and whether it came from your Search Result Filter rules or your global Blocked list. When several rules match one result, the one that actually decided the outcome is marked.",
      "That popup also offers “Show on this page” for a hidden result — a one-off reveal that changes nothing in your settings — and a link straight to the rules if you want to edit them properly.",
      "Blocked sites now takes more than a domain. As well as example.com you can write *.example.com or example.com/adult/*, a whole top-level domain such as .xyz, a regular expression on the address like /example\\.(net|org)/, or one on the page title like title/Example Domain/.",
      "Patterns are checked when you save: one that will not compile, that uses a flag which would make it match only every other time, that is slow enough to freeze pages, or that the browser cannot use to block a page, is refused with the reason.",
      "Lines starting with # or ! are notes. They are ignored when matching and stay above the entries written under them when the list is sorted, so they work as section headings.",
      "A site on your blocked list is now also blocked as a source of pictures: its results are hidden in image search, and its images are hidden wherever they appear on other sites.",
      "The two pattern forms act at different moments, and the settings page says which is which. An address pattern stops the page before it loads at all; a page title is not known until the page has been read, so a title pattern lets it appear for a moment and then replaces it.",
      "A whole top-level domain blocks pages but is deliberately not applied to every image, script and request on every site you visit, which would slow all of them down. Pictures from a blocked TLD are hidden by the page instead.",
      "Pasting or importing a list accepts all the same forms, and the box now shows one example of each rather than leaving you to find out a rejected line at a time.",
      "The Allowlist still takes plain domains only, and now says so: an allow rule has to be certain which site it is opening up. The richer forms belong to Blocked sites.",
    ],
  },
  {
    version: "1.2.0",
    date: "August 2026",
    items: [
      "New Site Cleanup section — 21 switches for hiding the distracting parts of YouTube without blocking it: the home feed, Shorts, comments, recommendations, mixes, search filler, the description, channel row and action buttons, live chat, merch, end cards, info cards, autoplay, thumbnails, the top bar, the notification bell, and a black-and-white mode.",
      "A Shorts link now opens in the normal player instead of the swipe feed when Shorts are hidden.",
      "Your lock can now be a passphrase, not just digits. Letters, spaces and whole sentences all work, so you can use something you have to read and think about rather than a code you enter without looking.",
      "New Access Code — an optional second step after your lock. A random 32 to 256 character code appears and you retype it by hand, with copy and paste switched off and a typo giving you a fresh one. Off by default, and it guards the decisive moments unless you ask for more.",
      "The pause screen now actually stops the video. It used to blur the page while the audio kept playing, so pressing space carried on where you left off. It also blurs much harder.",
      "Every list — blocked sites, allowlist, bad-language words, toxic words — now takes a pasted list, and has Import, Export, automatic A-Z sorting and duplicate removal.",
      "Blocked words can be patterns: one line like /w[o0]rd/ covers many spellings. Plain words work exactly as before.",
      "The optional smart-detection model now downloads from a mirror if the original host is unreachable, and a failed download explains why instead of only saying 'try again'.",
      "Guardian Lock gates every action that weakens your protection — turning a module off, raising a Doomscroll time limit, allowlisting a site, or getting past the pause screen.",
      "Doomscroll Stopper is opt-in: limits stay off until you switch on the feeds you want capped.",
      "New Desktop Guard card in Security.",
      "Faster page filtering — idle-time batching, tighter DOM observers, and cheaper text scanning, so busy pages stay smooth.",
      "Firefox build, a published privacy policy, and refreshed icons.",
      "New What's New section, so every release explains itself.",
    ],
  },
  {
    version: "1.0.0",
    date: "July 2026",
    items: [
      "First release — bad-language filter, toxic comment hider, dark-pattern blocker with cookie auto-reject, popup & click-hijack blocker, gambling / financial / safety blocklists, URL shortener resolver, Doomscroll Stopper, Guardian Lock, and the protection dashboard.",
    ],
  },
];
