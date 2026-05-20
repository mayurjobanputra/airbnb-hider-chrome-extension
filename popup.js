// Airbnb Listing Hider - Popup Script

const STORAGE_KEY = "alh_hidden_listings";

function render(hiddenIds) {
  const statsEl = document.getElementById("stats");
  const actionsEl = document.getElementById("actions");

  const count = hiddenIds.length;

  if (count === 0) {
    statsEl.innerHTML = "No listings hidden yet.";
    actionsEl.innerHTML = `<p class="empty">Browse Airbnb search results and click the Hide button on any listing card.</p>`;
    return;
  }

  statsEl.innerHTML = `<strong>${count}</strong> listing${count !== 1 ? "s" : ""} hidden`;

  actionsEl.innerHTML = "";

  // Manage page link
  const manageLink = document.createElement("a");
  manageLink.className = "btn";
  manageLink.textContent = `View & manage hidden listings`;
  manageLink.href = chrome.runtime.getURL("manage.html");
  manageLink.target = "_blank";
  actionsEl.appendChild(manageLink);
}

// Load and render
chrome.storage.local.get({ [STORAGE_KEY]: [] }, (result) => {
  render(result[STORAGE_KEY]);
});

// Update if storage changes while popup is open
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_KEY]) {
    render(changes[STORAGE_KEY].newValue || []);
  }
});
