export class AssetGridModule {
  constructor(dataService, savedAssetsService, mode = "home") {
    this.dataService = dataService;
    this.savedAssetsService = savedAssetsService;
    this.mode = mode;

    this.gridElement = null;
    this.noResultsElement = null;

    this.assets = [];
    this.renderedCount = 0;
    this.batchSize = 6;

    // Cache DOM lookups
    this.cachedElements = new Map();

    // Debounced scroll handler for better performance
    this.onScroll = this.debounce(this.onScroll.bind(this), 16); // ~60fps

    // Use DocumentFragment for batch DOM operations
    this.fragment = document.createDocumentFragment();

    // Cache for asset lookup
    this.assetMap = new Map();
  }

  init() {
    this.cacheElements();

    if (this.mode === "home") {
      // Subscribe to data service changes (from FilterModule)
      this.dataService.subscribe((assets) => {
        this.assets = this.dataService.getFilteredAssets();
        this.updateAssetMap();
        this.resetRender();
      });

      // Initial load
      this.assets = this.dataService.getFilteredAssets();
    } else {
      // For saved assets, get them directly
      this.assets = this.savedAssetsService.getSavedAssets();
    }

    this.updateAssetMap();
    this.resetRender();
    this.addScrollListener();
  }

  // Cache DOM elements to avoid repeated queries
  cacheElements() {
    if (this.mode === "home") {
      this.gridElement = this.getCachedElement("assetsGrid");
      this.noResultsElement = this.getCachedElement("noResults");
    } else {
      this.gridElement = this.getCachedElement("savedAssetsGrid");
      this.noResultsElement = this.getCachedElement("savedNoResults");
    }
  }

  getCachedElement(id) {
    if (!this.cachedElements.has(id)) {
      this.cachedElements.set(id, document.getElementById(id));
    }
    return this.cachedElements.get(id);
  }

  // Create asset lookup map for O(1) access
  updateAssetMap() {
    this.assetMap.clear();
    this.assets.forEach((asset) => {
      this.assetMap.set(asset.id, asset);
    });
  }

  // Debounce function to limit scroll event frequency
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Method to reset the grid (called by FilterModule)
  reset() {
    // Get fresh data based on mode
    if (this.mode === "home") {
      this.assets = this.dataService.getFilteredAssets();
    } else {
      this.assets = this.savedAssetsService.getSavedAssets();
    }
    this.updateAssetMap();
    this.resetRender();
  }

  // Method to update assets (called by FilterModule after filtering)
  updateAssets(filteredAssets) {
    this.assets = filteredAssets;
    this.updateAssetMap();
    this.resetRender();
  }

  resetRender() {
    this.renderedCount = 0;
    if (this.gridElement) {
      // Use textContent for faster clearing
      this.gridElement.textContent = "";
    }
    this.renderNextBatch();
    this.addScrollListener();
  }

  addScrollListener() {
    // Remove existing listener first to avoid duplicates
    window.removeEventListener("scroll", this.onScroll);
    window.addEventListener("scroll", this.onScroll, { passive: true });
  }

  renderNextBatch() {
    if (!this.gridElement || this.assets.length === 0) {
      this.showNoResults();
      return;
    }

    this.hideNoResults();

    const nextBatch = this.assets.slice(
      this.renderedCount,
      this.renderedCount + this.batchSize
    );

    // Use DocumentFragment for efficient batch DOM insertion
    const fragment = document.createDocumentFragment();

    nextBatch.forEach((asset) => {
      const cardElement = this.createAssetCardElement(asset);
      fragment.appendChild(cardElement);
    });

    // Single DOM operation instead of multiple appendChild calls
    this.gridElement.appendChild(fragment);

    this.renderedCount += nextBatch.length;

    if (this.renderedCount >= this.assets.length) {
      window.removeEventListener("scroll", this.onScroll);
    }
  }

  getSketchfabModelUID(url) {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/[a-f0-9]{32}/i);
    return match ? match[0] : null;
  }

  // Create DOM element directly instead of using innerHTML
  createAssetCardElement(asset) {
    const cardElement = document.createElement("div");
    cardElement.className = "asset-card";

    const modelUID = this.getSketchfabModelUID(asset.sketchfabUrl);

    // Create iframe
    const iframe = document.createElement("iframe");
    iframe.className = "asset-embed";
    iframe.src = `https://sketchfab.com/models/${modelUID}/embed?autostart=0&ui_theme=dark&ui_controls=1&ui_infos=0&ui_watermark=0`;
    iframe.frameBorder = "0";
    // iframe.allow = "autoplay; fullscreen; vr";
    iframe.mozAllowFullScreen = true;
    iframe.webkitAllowFullScreen = true;

    // Create info container
    const infoDiv = document.createElement("div");
    infoDiv.className = "asset-info";

    // Category
    const categoryDiv = document.createElement("div");
    categoryDiv.className = "asset-category";
    categoryDiv.textContent = asset.collection
      ? `${asset.category} • ${asset.collection}`
      : asset.category;

    // Title
    const titleElement = document.createElement("h3");
    titleElement.className = "asset-title";
    titleElement.textContent = asset.title;

    // Author
    const authorDiv = document.createElement("div");
    authorDiv.className = "asset-author";
    const authorText = document.createTextNode("by ");
    const authorLink = document.createElement("a");
    authorLink.href = asset.authorUrl;
    authorLink.target = "_blank";
    authorLink.textContent = asset.author;
    authorDiv.appendChild(authorText);
    authorDiv.appendChild(authorLink);

    // Description
    const descElement = document.createElement("p");
    descElement.className = "asset-description";
    descElement.textContent = asset.description;

    // Actions container
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "asset-actions";

    // Sketchfab link
    const sketchfabLink = document.createElement("a");
    sketchfabLink.href = asset.sketchfabUrl;
    sketchfabLink.target = "_blank";
    sketchfabLink.className = "asset-link";
    sketchfabLink.innerHTML =
      'View on Sketchfab <i class="ri-share-box-line"></i>';

    // Save button
    const saveBtn = this.createSaveButton(asset);

    // Assemble everything
    actionsDiv.appendChild(sketchfabLink);
    actionsDiv.appendChild(saveBtn);

    infoDiv.appendChild(categoryDiv);
    infoDiv.appendChild(titleElement);
    infoDiv.appendChild(authorDiv);
    infoDiv.appendChild(descElement);
    infoDiv.appendChild(actionsDiv);

    cardElement.appendChild(iframe);
    cardElement.appendChild(infoDiv);

    return cardElement;
  }

  createSaveButton(asset) {
    const isSaved = this.savedAssetsService.isAssetSaved(asset.id);

    const saveBtn = document.createElement("button");
    saveBtn.className = isSaved ? "asset-save saved" : "asset-save";
    saveBtn.title =
      this.mode === "home"
        ? isSaved
          ? "Remove from Saved"
          : "Save Asset"
        : "Remove from Saved";

    const icon = document.createElement("i");
    icon.className = isSaved ? "ri-bookmark-fill" : "ri-bookmark-line";
    saveBtn.appendChild(icon);

    // Use event delegation pattern
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleSaveClick(
        asset.id,
        saveBtn,
        e.currentTarget.closest(".asset-card")
      );
    });

    return saveBtn;
  }

  handleSaveClick(assetId, saveBtn, cardElement) {
    const isSaved = this.savedAssetsService.isAssetSaved(assetId);

    if (isSaved) {
      this.savedAssetsService.removeAsset(assetId);
      saveBtn.classList.remove("saved");
      saveBtn.querySelector("i").className = "ri-bookmark-line";
      saveBtn.title = "Save Asset";
    } else {
      // Use cached asset from map instead of array.find()
      const asset = this.assetMap.get(assetId);
      if (asset) this.savedAssetsService.saveAsset(asset);
      saveBtn.classList.add("saved");
      saveBtn.querySelector("i").className = "ri-bookmark-fill";
      saveBtn.title = "Remove from Saved";
    }

    // Handle removal from saved assets view
    if (
      this.mode === "saved" &&
      !this.savedAssetsService.isAssetSaved(assetId)
    ) {
      cardElement.remove();
      if (this.gridElement.children.length === 0) {
        this.showNoResults();
      }
    }

    this.syncOtherGrid();
  }

  syncOtherGrid() {
    const isHome = this.mode === "home";
    const otherGrid = isHome ? window.assetGridSaved : window.assetGridHome;

    // Only refresh the other grid if it's different from this one
    if (otherGrid && otherGrid !== this) {
      // Use requestAnimationFrame for non-blocking update
      requestAnimationFrame(() => {
        otherGrid.reset();
      });
    }
  }

  showNoResults() {
    if (this.gridElement) this.gridElement.textContent = "";
    if (this.noResultsElement) this.noResultsElement.style.display = "block";
  }

  hideNoResults() {
    if (this.noResultsElement) this.noResultsElement.style.display = "none";
  }

  onScroll() {
    const nearBottom =
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
    if (nearBottom && this.renderedCount < this.assets.length) {
      this.renderNextBatch();
    }
  }

  refresh() {
    this.reset();
  }

  // Cleanup method for proper memory management
  destroy() {
    window.removeEventListener("scroll", this.onScroll);
    this.cachedElements.clear();
    this.assetMap.clear();
    this.gridElement = null;
    this.noResultsElement = null;
  }
}
