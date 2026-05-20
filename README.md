# Airbnb Listing Hider

Chrome extension that lets you hide Airbnb listings from search results. Hidden listings stay hidden across page changes, map moves, and browser sessions.

Tired of scrolling past the same listings you've already rejected? Just hide them.

## Features

- **Hide/Show button** on every listing card (appears on hover)
- **Map markers hidden too** — when you hide a listing, its pin disappears from the map
- **Persistent** — hidden listings are saved locally and survive page reloads, navigation, and browser restarts
- **Floating counter** — shows how many listings are hidden; click to toggle showing all
- **Popup controls** — view count, clear all, export/import your hidden list
- **Multi-tab sync** — hiding in one tab updates all open Airbnb tabs
- **Works on** airbnb.com and airbnb.ca

## Install

1. Clone or download this repo
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select this folder

## How It Works

- Listing cards are identified by their numeric listing ID (extracted from URLs), so hiding is reliable even if titles change
- Map markers are matched by their title text (e.g., "Apartment in Khet Ratchathewi") since Google Maps markers don't expose listing IDs
- A MutationObserver + polling combo ensures new cards and markers are caught as Airbnb dynamically loads content

## Usage

1. Search for listings on Airbnb
2. Hover over any listing card — a **Hide** button appears in the top-left
3. Click it to hide the listing (card fades out, map pin disappears)
4. Click **Show** on a hidden listing to bring it back
5. Click the floating badge (bottom-left) to temporarily reveal all hidden listings
6. Use the extension popup to clear all, export, or import your hidden list

## File Structure

```
manifest.json   — Extension manifest (Manifest V3)
content.js      — Main content script (injected on Airbnb pages)
styles.css      — Styles for hide buttons, hidden state, counter badge
popup.html      — Extension popup UI
popup.js        — Popup logic (stats, clear, export/import)
icons/          — Extension icons
```

## Limitations

- Map marker hiding relies on matching the listing's title text. If two listings share the exact same title and one is hidden, both map pins will be hidden. In practice this is rare since prices differ.
- Only works on `www.airbnb.com` and `www.airbnb.ca`. To add more domains, edit the `matches` array in `manifest.json`.

## Credits

Inspired by [Airbnb Sanity](https://github.com/jrieke/airbnb-sanity) by Johannes Rieke. Rebuilt from scratch for the current (2025) Airbnb DOM structure using stable `data-testid` selectors.

## License

MIT
