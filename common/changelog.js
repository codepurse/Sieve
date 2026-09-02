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
  {
    version: "1.4.0",
    date: "September 2026",
    items: [
      "New Ad & Trackers section, with one switch that turns the whole thing on. It is off until you switch it on. Behind it are several separate parts, and the rest of these notes explain each one, because they work in different ways and fail in different ways.",
      "Two of them are domain blockers. One stops the analytics, fingerprinting and behaviour-tracking services that pages load in the background. The other stops the ad exchanges and delivery networks themselves.",
      "Those two carry different risk. Tracker blocking rarely changes how a page looks. Ad-network blocking removes more, and is the more likely of the two to upset a site.",
      "The whole section is marked Beta on purpose, and the settings page is blunt about what they are: domain blockers. They stop known addresses. Neither can touch YouTube ads — YouTube sends those from the same address as the video itself — which is why there is a separate switch for them.",
      "Some sites use these same services for signing in, checking out, or bot checks. If one misbehaves, add it to your Allowlist under Site Blocking: that stands Sieve down on that site alone and leaves it working everywhere else. On an allowlisted site the page-reading parts are not even loaded. There is a link in the section for reporting a site that broke.",
      "The lists are built from EasyPrivacy and EasyList and ship inside the extension, so they work offline and nothing is fetched while you browse. Where those lists allow a service on particular sites, Sieve keeps blocking it everywhere else rather than switching it off entirely.",
      "YouTube is handled separately, by its own part of this. It works differently, and the settings page explains how. The two domain blockers cannot touch YouTube's ads, because YouTube sends them from the same address as the video itself — so this one edits the ads out of YouTube's own page data as it loads.",
      "It covers both kinds of YouTube ad. The video ads before and during a video: the player finds no ad break to play. And the display ads: the sponsored tile in your home feed, the promoted result above a search, the banner beside the video, and the ad between two Shorts. Those are removed from the list they arrive in rather than just hidden, so no empty gap is left where one was.",
      "It also stops YouTube being told that the ad breaks are missing, and clears the “ad blockers are not allowed” message if it appears. Without that, YouTube spots the missing ads within a few videos and starts serving them again by a route the switch cannot reach.",
      "Expect that one to break, and to keep needing updates. YouTube actively works against it and changes how this works without warning, often faster than an extension update can be reviewed and published. When it breaks the ads simply come back until Sieve is updated — it will not stop your videos playing. It cannot remove ads stitched into the video stream itself, and it is off until you switch it on.",
      "The Protection Dashboard counts every part of it. A new “Ads & trackers” section there shows how many tracking requests, ad-network requests, YouTube ads, Facebook ads and ad-blocker walls were dealt with today and over the week, alongside everything else Sieve blocked.",
      "Expect the request numbers to be large — a single page can pull in dozens of trackers, so these climb far faster than the site blocks above them. Only the running total is kept: never which site you were on, never which tracker it was, and nothing leaves your device.",
      "On Firefox the two request counters stay at zero. Firefox does not let an extension read back which of its own block rules fired, so there is nothing to count there. The blocking itself is unaffected, and YouTube ads are still counted normally.",
      "Facebook is handled separately again. The domain blockers cannot touch the sponsored posts in your feed for the same reason they cannot touch YouTube's ads: Facebook sends them from its own address, in the same batch as your friends' posts, with the pictures coming from the same place as everyone else's photos. There is nothing to block that would not also block the feed.",
      "So this one removes the sponsored posts from Facebook's own page data as it arrives, and the feed is built without them — no gap where an advert was. Anything that gets past that is found on the page afterwards and collapsed. It covers the sponsored posts in your feed, the ads in the right-hand column, and the sponsored results in Marketplace, Watch and search.",
      "Mostly it finds them by the word “Sponsored” under the advertiser's name. Facebook scrambles that word on purpose — splitting it into single letters, mixing in invisible decoy letters, and shuffling the order — so Sieve reads it the way you do: it asks the browser which letters are actually visible, and in what order, and puts the word back together. That works in the other languages Facebook writes the word in too.",
      "Because it is reading a page rather than blocking an address, it can hide the wrong thing. If a post disappears that should not have, turn the switch off and reload — nothing is deleted, only hidden, and it comes straight back. Expect this one to break and to keep needing updates, the same way the YouTube switch does.",
      "It leaves “Suggested for you”, “People you may know” and the Reels row alone. Those are Facebook promoting Facebook rather than advertising, and this switch only claims to remove ads.",
      "Sites that put up a “please turn off your ad blocker” message are handled too. Nearly all of them work it out the same way: they load an advert, or a script named after one, and check whether it arrived. Blocking that request is what gives the game away — a request that fails is something the page can see. So Sieve answers those checks instead of letting them fail, and on most sites the message never appears at all.",
      "If one appears anyway it is cleared, along with everything that came with it: the page you could not scroll, the article behind a blur, the text you could not select. Sieve finds the message by reading what it says rather than by keeping a list of sites, so it works on sites nobody has reported yet, and it reads English, German, Spanish, Portuguese, French, Italian and Dutch.",
      "It cannot get past every wall, and the settings page says which. A site that decides on its own server, or that simply refuses to send the page until the blocker is off, is beyond what any extension can do from inside the browser. And because this part reads the page, it can occasionally hide a genuine pop-up — nothing is deleted, so switching Sieve off and reloading brings it straight back.",
      "The empty boxes are tidied up as well. Blocking an advert stops the advert, but the space the page reserved for it stays behind — on one gallery page we measured ninety-six empty boxes and 29,000 pixels of blank space. Sieve now hides those once it is sure they are staying empty, so the page closes up instead of reading as full of holes.",
      "It waits about twelve seconds before doing that, and the wait is deliberate rather than slow. Hiding an advert's box is one of the clearest ways a site can tell you are using a blocker, so Sieve answers that question first and tidies up afterwards.",
      "It only ever hides a box that is already empty, and only a box named after advertising — never one with words or a picture still in it. Nothing is deleted: switch this off, reload, and every box comes back exactly as the site sent it. It cannot remove an advert that did load, such as a site's own promotions for its sister publications.",
      "A missing address can now be added by hand. The blocking lists come from EasyList and EasyPrivacy, and they have gaps — the first one found was an audio-advert player that neither list carries. Sieve keeps its own short list of additions alongside them, so a gap can be closed without waiting for the lists to catch up.",
      "Turning it off asks for your lock, like every other change that weakens your protection. Turning it on does not.",
    ],
  },
  {
    version: "1.3.0",
    date: "August 2026",
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
