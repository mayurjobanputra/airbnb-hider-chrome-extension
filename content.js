// Airbnb Listing Hider - Content Script
// Adds hide/show buttons to Airbnb search result cards.
// Uses listing IDs from URLs for reliable identification across sessions.
// Also hides corresponding map markers by matching title text.

(function () {
  "use strict";

  const STORAGE_KEY = "alh_hidden_listings";
  const STORAGE_TITLES_KEY = "alh_hidden_titles";
  const POLL_INTERVAL = 1500;
  const MARKER_ATTR = "data-alh-processed";

  let hiddenListings = new Set();
  // Maps listing ID -> title (from card-title) for map marker matching
  let hiddenTitles = new Map();
  let showAll = false;
  let counterEl = null;

  // --- Storage ---

  function loadHiddenListings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        { [STORAGE_KEY]: [], [STORAGE_TITLES_KEY]: {} },
        (result) => {
          hiddenListings = new Set(result[STORAGE_KEY]);
          hiddenTitles = new Map(Object.entries(result[STORAGE_TITLES_KEY]));
          resolve();
        }
      );
    });
  }

  function saveHiddenListings() {
    chrome.storage.local.set({
      [STORAGE_KEY]: Array.from(hiddenListings),
      [STORAGE_TITLES_KEY]: Object.fromEntries(hiddenTitles),
    });
  }

  // --- Listing ID extraction ---

  function getListingId(cardEl) {
    // Primary: extract from the link's target attribute (target="listing_12345")
    const link = cardEl.querySelector('a[target^="listing_"]');
    if (link) {
      const match = link.getAttribute("target").match(/listing_(\d+)/);
      if (match) return match[1];
    }

    // Fallback: extract from href (/rooms/12345?...)
    const anyLink = cardEl.querySelector('a[href*="/rooms/"]');
    if (anyLink) {
      const match = anyLink.getAttribute("href").match(/\/rooms\/(\d+)/);
      if (match) return match[1];
    }

    // Fallback: extract from aria-labelledby (title_12345)
    const labelledLink = cardEl.querySelector("a[aria-labelledby]");
    if (labelledLink) {
      const match = labelledLink
        .getAttribute("aria-labelledby")
        .match(/title_(\d+)/);
      if (match) return match[1];
    }

    return null;
  }

  function getListingTitle(cardEl) {
    // Get the card title (e.g., "Apartment in Khet Ratchathewi") used for map marker matching
    const titleEl = cardEl.querySelector('[data-testid="listing-card-title"]');
    if (titleEl) return titleEl.textContent.trim();
    return null;
  }

  // --- UI ---

  function createHideButton(cardEl, listingId) {
    const btn = document.createElement("button");
    btn.className = "alh-hide-btn";
    btn.title = "Hide this listing";
    btn.setAttribute("aria-label", "Hide this listing");

    btn.textContent = "Hide";

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleListing(cardEl, listingId);
    });

    return btn;
  }

  function toggleListing(cardEl, listingId) {
    if (hiddenListings.has(listingId)) {
      // Unhide
      hiddenListings.delete(listingId);
      hiddenTitles.delete(listingId);
      cardEl.classList.remove("alh-hidden", "alh-collapsed");
      const btn = cardEl.querySelector(".alh-hide-btn");
      if (btn) {
        btn.title = "Hide this listing";
        btn.setAttribute("aria-label", "Hide this listing");
        btn.textContent = "Hide";
      }
    } else {
      // Hide
      hiddenListings.add(listingId);
      const title = getListingTitle(cardEl);
      if (title) hiddenTitles.set(listingId, title);
      cardEl.classList.add("alh-hidden");
      const btn = cardEl.querySelector(".alh-hide-btn");
      if (btn) {
        btn.title = "Show this listing";
        btn.setAttribute("aria-label", "Show this listing");
        btn.textContent = "Show";
      }
    }

    saveHiddenListings();
    updateCounter();
    processMapMarkers();
  }

  function applyHiddenState(cardEl, listingId) {
    if (hiddenListings.has(listingId)) {
      cardEl.classList.add("alh-hidden");
      const btn = cardEl.querySelector(".alh-hide-btn");
      if (btn) {
        btn.title = "Show this listing";
        btn.setAttribute("aria-label", "Show this listing");
        btn.textContent = "Show";
      }
    }
  }

  // --- Counter badge ---

  function createCounter() {
    counterEl = document.createElement("div");
    counterEl.className = "alh-counter alh-counter-hidden";
    counterEl.innerHTML = `
      <svg class="alh-counter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="1" y1="1" x2="23" y2="23" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="alh-counter-text"></span>
    `;

    counterEl.addEventListener("click", () => {
      showAll = !showAll;
      document.body.classList.toggle("alh-show-all", showAll);
      updateCounter();
    });

    document.body.appendChild(counterEl);
  }

  function updateCounter() {
    if (!counterEl) return;

    const count = hiddenListings.size;
    const textEl = counterEl.querySelector(".alh-counter-text");

    if (count === 0) {
      counterEl.classList.add("alh-counter-hidden");
    } else {
      counterEl.classList.remove("alh-counter-hidden");
      textEl.textContent = showAll
        ? `${count} hidden (showing all)`
        : `${count} hidden`;
    }
  }

  // --- Map marker hiding ---

  function getHiddenTitleSet() {
    return new Set(hiddenTitles.values());
  }

  function processMapMarkers() {
    const titleSet = getHiddenTitleSet();
    if (titleSet.size === 0) {
      // Unhide all markers
      document
        .querySelectorAll('[data-testid="map/markers/BasePillMarker"]')
        .forEach((marker) => {
          const container = marker.closest("gmp-advanced-marker") ||
            marker.closest(".GoogleAdvancedMarker-container");
          if (container) {
            container.style.display = "";
            container.style.opacity = "";
          }
        });
      return;
    }

    const markers = document.querySelectorAll(
      '[data-testid="map/markers/BasePillMarker"]'
    );

    markers.forEach((marker) => {
      // The marker's visible text contains the title + price, e.g.
      // "Apartment in Khet Ratchathewi, $1,053 CAD"
      // We check if the marker text starts with any hidden title
      const markerText = marker.textContent.trim();
      const container = marker.closest("gmp-advanced-marker") ||
        marker.closest(".GoogleAdvancedMarker-container");
      if (!container) return;

      let isHidden = false;
      for (const title of titleSet) {
        if (markerText.startsWith(title)) {
          isHidden = true;
          break;
        }
      }

      if (isHidden && !showAll) {
        container.style.display = "none";
      } else if (isHidden && showAll) {
        container.style.display = "";
        container.style.opacity = "0.3";
      } else {
        container.style.display = "";
        container.style.opacity = "";
      }
    });
  }

  // --- Main processing ---

  function processCards() {
    const cards = document.querySelectorAll(
      '[data-testid="card-container"]:not([' + MARKER_ATTR + "])"
    );

    cards.forEach((card) => {
      card.setAttribute(MARKER_ATTR, "true");

      const listingId = getListingId(card);
      if (!listingId) return;

      // Store the ID on the element for easy access
      card.dataset.alhListingId = listingId;

      // Track title for map marker matching
      const title = getListingTitle(card);
      if (title && hiddenListings.has(listingId)) {
        hiddenTitles.set(listingId, title);
      }

      // Make the card position relative so the button positions correctly
      const computedPos = window.getComputedStyle(card).position;
      if (computedPos === "static") {
        card.style.position = "relative";
      }

      // Add hide button
      const btn = createHideButton(card, listingId);
      card.appendChild(btn);

      // Apply hidden state if previously hidden
      applyHiddenState(card, listingId);
    });

    updateCounter();
    processMapMarkers();
  }

  // --- Init ---

  async function init() {
    await loadHiddenListings();
    createCounter();
    updateCounter();
    processCards();

    // Poll for new cards (Airbnb loads dynamically on scroll, page change, map move)
    setInterval(processCards, POLL_INTERVAL);

    // Also observe DOM mutations for faster response
    const observer = new MutationObserver((mutations) => {
      let hasNewCards = false;
      let hasMapChanges = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              if (
                node.matches?.('[data-testid="card-container"]') ||
                node.querySelector?.('[data-testid="card-container"]')
              ) {
                hasNewCards = true;
              }
              if (
                node.matches?.('[data-testid="map/markers/BasePillMarker"]') ||
                node.querySelector?.('[data-testid="map/markers/BasePillMarker"]') ||
                node.matches?.("gmp-advanced-marker") ||
                node.querySelector?.("gmp-advanced-marker") ||
                node.classList?.contains("GoogleAdvancedMarker-container")
              ) {
                hasMapChanges = true;
              }
            }
          }
        }
        if (hasNewCards && hasMapChanges) break;
      }
      if (hasNewCards) {
        setTimeout(processCards, 100);
      }
      if (hasMapChanges) {
        setTimeout(processMapMarkers, 200);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Wait for DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Listen for storage changes (sync across tabs)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes[STORAGE_KEY] || changes[STORAGE_TITLES_KEY])) {
      if (changes[STORAGE_KEY]) {
        hiddenListings = new Set(changes[STORAGE_KEY].newValue || []);
      }
      if (changes[STORAGE_TITLES_KEY]) {
        hiddenTitles = new Map(
          Object.entries(changes[STORAGE_TITLES_KEY].newValue || {})
        );
      }
      // Re-apply states to all processed cards
      document
        .querySelectorAll("[" + MARKER_ATTR + "]")
        .forEach((card) => {
          const id = card.dataset.alhListingId;
          if (!id) return;
          if (hiddenListings.has(id)) {
            card.classList.add("alh-hidden");
          } else {
            card.classList.remove("alh-hidden", "alh-collapsed");
          }
        });
      updateCounter();
      processMapMarkers();
    }
  });
})();
