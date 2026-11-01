# Velocity Systems — build roadmap

This is the tracked implementation list for the current polish and feature batch. `[~]` means a useful first pass exists but the full request still needs finishing.

## Platform, reliability and privacy
- [x] Automated site health checker: scan every generated page for broken local links/assets, missing metadata, JavaScript syntax errors, and (when Playwright is installed) runtime console errors and horizontal overflow.
- [~] Privacy indicators on tool detail pages: distinguish local-only processing, external-service requests, and server uploads; disclose third-party calls before use.
- [~] Consistent tool error reporting: actionable errors, retry/recovery guidance, and explanations for denied permissions, unsupported browser APIs, network/CORS failures and storage limits.
- [x] Settings backup/restore: existing Settings data panel already exports and imports `system-*` and `vs-*` browser data, including settings, bookmarks and pins. Verify and improve rather than duplicate it.
- [x] Preserve Game Deals scroll position across refresh and return navigation.

## Appearance and interface
- [x] Default theme follows the operating system's light/dark preference.
- [ ] Custom theme supports gradient backgrounds and user-selected colours.
- [ ] Standardise number inputs and spinner/stepper controls.
- [ ] Fix inconsistent borders on tool cards.

## Existing tools
- [x] Countdown Timer: pause and resume without losing remaining time.
- [x] Device Info: copy public IP and show IPv4 and IPv6 where available.
- [x] Barcode Generator: already had the Show text under bars checkbox; verified existing functionality rather than duplicating it. option to hide the human-readable text below the barcode.
- [x] New IP Lookup tool: show available IP/network metadata and approximate geolocation, with clear source and accuracy notes.
- [x] New Microphone Tester: choose an available microphone, record/play/download samples, and monitor live input with a default 500 ms delay and adjustable delay.

## Library and new project tools
- [x] Add Fluent Flyout to the software library: https://fluentflyout.com
- [~] Website-to-EXE tool: accepts a public GitHub repository URL and optional folder path, app name and branch; generates an Electron project ZIP and Windows GitHub Actions workflow. Icon/window customisation and local-folder upload are not included yet.
- [x] Add Automated Site Health Checker as an accessible developer tool/command, not only a one-off manual audit.

## Implementation constraints
- Keep the site static-host compatible (Cloudflare Pages, no mandatory server/backend).
- Do not claim that browser-only code can compile a Windows executable; use a Windows GitHub Actions runner for the EXE build.
- IP geolocation is approximate and may expose the queried public IP to the selected lookup provider.
- Microphone features require explicit browser permission and HTTPS or localhost.
