# Airbnb Listing Hider

Chrome extension that lets you hide Airbnb listings from search results. Stop scrolling past the same places you've already rejected.

## What it does

- Adds a **Hide** button to each listing card on Airbnb search results
- Hidden listings stay hidden across page changes, map moves, and browser sessions
- Click **Show** on a hidden listing to bring it back
- Floating badge shows how many listings you've hidden (click to toggle visibility of all hidden ones)
- Works on airbnb.com and airbnb.ca

## Install

1. Download or clone this repo
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select this folder

## How it works

The extension identifies listings by their numeric ID from the URL (e.g. `/rooms/36894063`). This is more reliable than matching by title, which can change with translations or A/B tests.

Hidden listing IDs are stored in `chrome.storage.local`, so they persist across sessions and sync between tabs.

New listings are detected via MutationObserver + polling, so it works even when Airbnb dynamically loads content as you scroll or move the map.

## Popup

Click the extension icon for:
- Count of hidden listings
- **Clear all** — unhide everything
- **Export** — save your hidden list as JSON
- **Import** — load a previously exported list (merges with existing)

## Files

```
manifest.json   — Extension config (Manifest V3)
content.js      — Main logic: finds cards, adds buttons, manages state
styles.css      — Button and hidden-card styling
popup.html/js   — Extension popup UI
icons/          — Extension icons
```

## Credits

Inspired by [jrieke/airbnb-sanity](https://github.com/jrieke/airbnb-sanity), which no longer works due to Airbnb DOM changes. This is a ground-up rewrite using current (2025) selectors.

## License

MIT
