# Velocity Systems — implementation roadmap

This tracks the requested feature batch. [x] means implemented in the feature branch; CI and browser verification must pass before merging.

## Platform, reliability and privacy
- [x] Automated site health checker: scan generated HTML pages for broken local links and assets, CSS url() references, missing title/description/canonical/viewport metadata, missing image alt attributes, JavaScript syntax errors, browser runtime errors, failed local resources and desktop/mobile horizontal overflow.
- [x] Privacy disclosures at the bottom of tool pages: identify local processing versus external APIs, explain the relevant providers and disclose the data/request context.
- [x] Consistent tool error reporting: shared accessible error panel, recovery guidance and visible handling for unhandled runtime/asynchronous failures.
- [x] Settings backup/restore: export and import settings, bookmarks, pins, tool state and other system-* / vs-* data. Cookie-backed preferences are included too.
- [x] Preserve Game Deals scroll position across refresh and returning to the page in the same tab.

## Appearance and interface
- [x] Default theme follows the operating system's light/dark preference.
- [x] Custom theme supports a user-selected accent, solid background or two-colour gradient, and gradient angle.
- [x] Standardise number inputs with consistent plus/minus steppers across tool embeds and Settings.
- [x] Strengthen tool-card borders so every card has a visible edge.

## Existing tools
- [x] Countdown Timer: pause/resume and persist paused remaining time across refreshes.
- [x] Device Info: copy public IPv4 and IPv6 addresses; disclose ipify requests.
- [x] Barcode Generator: already includes the Show text under bars checkbox; verified rather than duplicated.
- [x] IP Address Lookup: IP/network metadata, approximate location and an interactive OpenStreetMap map.
- [x] Microphone Tester: device selection, recording, playback/download, live monitoring and adjustable delay (500 ms default).

## Library and new project tools
- [x] Add Fluent Flyout to the software library: https://fluentflyout.com
- [x] Website-to-EXE Builder: cloud build from a public GitHub repository/subfolder creates a real portable Windows EXE via GitHub Actions; local folder mode packages the selected website with a Windows build script that produces the EXE locally. Includes app name, icon and window dimensions.
- [x] Add the automated health-check workflow to GitHub Actions.

## Build and privacy constraints
- The cloud EXE workflow needs a fine-grained GitHub token with Actions read/write permission for the Velocity Systems repository. The token is used in-page only and is not saved.
- Local-folder builds do not upload the website source; the downloaded build kit compiles on Windows with Node.js 20 or later.
- The IP geolocation map is approximate. The IP address is sent to ipapi.co; map tiles are requested from OpenStreetMap.
- Microphone access requires explicit browser permission and HTTPS or localhost.
- The automated health check checks local links/assets and browser layout/runtime behaviour. Third-party endpoint uptime is not treated as a guaranteed build gate.
