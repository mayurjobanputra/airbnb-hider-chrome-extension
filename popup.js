// Airbnb Listing Hider - Popup Script

const STORAGE_KEY = "alh_hidden_listings";

function render(hiddenIds) {
  const statsEl = document.getElementById("stats");
  const actionsEl = document.getElementById("actions");

  const count = hiddenIds.length;

  if (count === 0) {
    statsEl.innerHTML = "No listings hidden yet.";
    actionsEl.innerHTML = `<p class="empty">Browse Airbnb search results and click the ✕ button on any listing card to hide it.</p>`;
    return;
  }

  statsEl.innerHTML = `<strong>${count}</strong> listing${count !== 1 ? "s" : ""} hidden`;

  actionsEl.innerHTML = "";

  const clearBtn = document.createElement("button");
  clearBtn.className = "danger";
  clearBtn.textContent = `Clear all ${count} hidden listing${count !== 1 ? "s" : ""}`;
  clearBtn.addEventListener("click", () => {
    if (confirm(`Unhide all ${count} listings? This cannot be undone.`)) {
      chrome.storage.local.set({ [STORAGE_KEY]: [] }, () => {
        render([]);
      });
    }
  });
  actionsEl.appendChild(clearBtn);

  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export hidden list";
  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(hiddenIds, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "airbnb-hidden-listings.json";
    a.click();
    URL.revokeObjectURL(url);
  });
  actionsEl.appendChild(exportBtn);

  const importBtn = document.createElement("button");
  importBtn.textContent = "Import hidden list";
  importBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target.result);
          if (!Array.isArray(imported)) throw new Error("Invalid format");
          // Merge with existing
          const merged = [...new Set([...hiddenIds, ...imported])];
          chrome.storage.local.set({ [STORAGE_KEY]: merged }, () => {
            render(merged);
          });
        } catch (err) {
          alert("Invalid file format. Expected a JSON array of listing IDs.");
        }
      };
      reader.readAsText(file);
    });
    input.click();
  });
  actionsEl.appendChild(importBtn);
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
