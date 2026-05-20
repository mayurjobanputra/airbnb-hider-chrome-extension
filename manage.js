// Airbnb Listing Hider — Manage Page

const STORAGE_KEY = "alh_hidden_listings";
const STORAGE_TITLES_KEY = "alh_hidden_titles";

let hiddenIds = [];
let hiddenTitles = {};

function load() {
  chrome.storage.local.get(
    { [STORAGE_KEY]: [], [STORAGE_TITLES_KEY]: {} },
    (result) => {
      hiddenIds = result[STORAGE_KEY];
      hiddenTitles = result[STORAGE_TITLES_KEY];
      render();
    }
  );
}

function save() {
  chrome.storage.local.set({
    [STORAGE_KEY]: hiddenIds,
    [STORAGE_TITLES_KEY]: hiddenTitles,
  });
}

function render() {
  const subtitle = document.getElementById("subtitle");
  const content = document.getElementById("content");
  const count = hiddenIds.length;

  subtitle.textContent = count === 0
    ? "No listings hidden yet."
    : `${count} listing${count !== 1 ? "s" : ""} hidden`;

  if (count === 0) {
    content.innerHTML = '<div class="empty">Browse Airbnb search results and click the Hide button on any listing card to hide it.</div>';
    return;
  }

  let html = '<table class="listing-table"><thead><tr><th>#</th><th>Listing ID</th><th>Title / Map Key</th><th>Link</th><th></th></tr></thead><tbody>';

  hiddenIds.forEach((id, index) => {
    const title = hiddenTitles[id] || "—";
    const url = `https://www.airbnb.com/rooms/${id}`;
    html += `<tr>
      <td>${index + 1}</td>
      <td class="listing-id">${id}</td>
      <td>${escapeHtml(title)}</td>
      <td><a class="listing-link" href="${url}" target="_blank" rel="noopener">View</a></td>
      <td><button class="remove-btn" data-id="${id}">Remove</button></td>
    </tr>`;
  });

  html += "</tbody></table>";
  content.innerHTML = html;

  // Attach remove handlers
  content.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      hiddenIds = hiddenIds.filter((x) => x !== id);
      delete hiddenTitles[id];
      save();
      render();
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Export
document.getElementById("export-btn").addEventListener("click", () => {
  const area = document.getElementById("export-area");
  const textarea = document.getElementById("export-text");

  if (area.style.display === "block") {
    area.style.display = "none";
    return;
  }

  const data = { listings: hiddenIds, titles: hiddenTitles };
  textarea.value = JSON.stringify(data, null, 2);
  area.style.display = "block";
  textarea.select();
});

// Import
document.getElementById("import-btn").addEventListener("click", () => {
  document.getElementById("import-file").click();
});

document.getElementById("import-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const raw = JSON.parse(ev.target.result);

      // Support both formats: plain array or {listings, titles} object
      let importedIds = [];
      let importedTitles = {};

      if (Array.isArray(raw)) {
        importedIds = raw;
      } else if (raw.listings && Array.isArray(raw.listings)) {
        importedIds = raw.listings;
        importedTitles = raw.titles || {};
      } else {
        throw new Error("Invalid format");
      }

      // Merge
      const mergedIds = [...new Set([...hiddenIds, ...importedIds])];
      const mergedTitles = { ...hiddenTitles, ...importedTitles };

      hiddenIds = mergedIds;
      hiddenTitles = mergedTitles;
      save();
      render();

      alert(`Imported ${importedIds.length} listings (${mergedIds.length} total after merge).`);
    } catch (err) {
      alert("Invalid file. Expected JSON with a listings array.");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

// Clear all
document.getElementById("clear-btn").addEventListener("click", () => {
  if (!confirm(`Unhide all ${hiddenIds.length} listings? This cannot be undone.`)) return;
  hiddenIds = [];
  hiddenTitles = {};
  save();
  render();
});

// Listen for external changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes[STORAGE_KEY] || changes[STORAGE_TITLES_KEY])) {
    load();
  }
});

// Init
load();
