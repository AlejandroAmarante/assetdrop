export class AssetGridModule {
  constructor(dataService, savedAssetsService, mode = "home") {
    this.dataService = dataService;
    this.savedAssetsService = savedAssetsService;
    this.mode = mode; // "home" or "saved"

    this.gridElement = null;
    this.noResultsElement = null;

    this.assets = [];
    this.renderedCount = 0;
    this.batchSize = 6;

    this.onScroll = this.onScroll.bind(this);
  }

  init() {
    if (this.mode === "home") {
      this.gridElement = document.getElementById("assetsGrid");
      this.noResultsElement = document.getElementById("noResults");

      // Subscribe to data service changes (from FilterModule)
      this.dataService.subscribe((assets) => {
        this.assets = this.dataService.getFilteredAssets();
        this.resetRender();
      });

      // Initial load
      this.assets = this.dataService.getFilteredAssets();
    } else {
      this.gridElement = document.getElementById("savedAssetsGrid");
      this.noResultsElement = document.getElementById("savedNoResults");

      // For saved assets, get them directly
      this.assets = this.savedAssetsService.getSavedAssets();
    }

    this.resetRender();
    window.addEventListener("scroll", this.onScroll);
  }

  // Method to reset the grid (called by FilterModule)
  reset() {
    // Get fresh data based on mode
    if (this.mode === "home") {
      this.assets = this.dataService.getFilteredAssets();
    } else {
      this.assets = this.savedAssetsService.getSavedAssets();
    }
    this.resetRender();
  }

  // Method to update assets (called by FilterModule after filtering)
  updateAssets(filteredAssets) {
    this.assets = filteredAssets;
    this.resetRender();
  }

  resetRender() {
    this.renderedCount = 0;
    if (this.gridElement) this.gridElement.innerHTML = "";
    this.renderNextBatch();
    // Re-add scroll listener because it might have been removed
    window.addEventListener("scroll", this.onScroll);
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

    nextBatch.forEach((asset) => {
      const cardHTML = this.createAssetCard(asset);
      const temp = document.createElement("div");
      temp.innerHTML = cardHTML;
      const cardElement = temp.firstElementChild;

      const btn = cardElement.querySelector(".asset-save");
      btn.addEventListener("click", (e) => {
        e.preventDefault();

        if (this.mode === "home") {
          this.handleSaveClick(asset.id, btn);
        } else {
          this.savedAssetsService.removeAsset(asset.id);
          cardElement.remove();
          if (this.gridElement.children.length === 0) {
            this.showNoResults();
          }
          this.syncOtherGrid();
        }
      });

      this.gridElement.appendChild(cardElement);
    });

    this.renderedCount += nextBatch.length;

    if (this.renderedCount >= this.assets.length) {
      window.removeEventListener("scroll", this.onScroll);
    }
  }

  handleSaveClick(assetId, saveBtn) {
    const isSaved = this.savedAssetsService.isAssetSaved(assetId);

    if (isSaved) {
      this.savedAssetsService.removeAsset(assetId);
      saveBtn.classList.remove("saved");
      saveBtn.querySelector("i").className = "ri-bookmark-line";
      saveBtn.title = "Save Asset";
    } else {
      const asset = this.assets.find((a) => a.id === assetId);
      if (asset) this.savedAssetsService.saveAsset(asset);
      saveBtn.classList.add("saved");
      saveBtn.querySelector("i").className = "ri-bookmark-fill";
      saveBtn.title = "Remove from Saved";
    }

    this.syncOtherGrid();
  }

  syncOtherGrid() {
    const isHome = this.mode === "home";
    const otherGrid = isHome ? window.assetGridSaved : window.assetGridHome;

    // Only refresh the other grid if it's different from this one
    if (otherGrid && otherGrid !== this) {
      otherGrid.reset();
    }
  }

  createAssetCard(asset) {
    const categoryDisplay = asset.collection
      ? `${asset.category} • ${asset.collection}`
      : asset.category;

    const isSaved = this.savedAssetsService.isAssetSaved(asset.id);
    const icon = isSaved ? "ri-bookmark-fill" : "ri-bookmark-line";
    const btnClass = isSaved ? "asset-save saved" : "asset-save";
    const title =
      this.mode === "home"
        ? isSaved
          ? "Remove from Saved"
          : "Save Asset"
        : "Remove from Saved";

    return `
			<div class="asset-card">
				<iframe
					class="asset-embed"
					src="https://sketchfab.com/models/${asset.sketchfabId}/embed?autostart=0&ui_theme=dark&ui_controls=1&ui_infos=0&ui_watermark=0"
					frameborder="0"
					allow="autoplay; fullscreen; vr"
					mozallowfullscreen="true"
					webkitallowfullscreen="true">
				</iframe>
				<div class="asset-info">
					<div class="asset-category">${categoryDisplay}</div>
					<h3 class="asset-title">${asset.title}</h3>
          <div class="asset-author">
            by <a href="${asset.authorUrl}" target="_blank">${asset.author}</a>
          </div>
					<p class="asset-description">${asset.description}</p>
					<div class="asset-actions">
						<a href="${asset.sketchfabUrl}" target="_blank" class="asset-link">
							View on Sketchfab <i class="ri-share-box-line"></i>
						</a>
						<button class="${btnClass}" title="${title}">
							<i class="${icon}"></i>
						</button>
					</div>
				</div>
			</div>
		`;
  }

  showNoResults() {
    if (this.gridElement) this.gridElement.innerHTML = "";
    if (this.noResultsElement) this.noResultsElement.style.display = "block";
  }

  hideNoResults() {
    if (this.noResultsElement) this.noResultsElement.style.display = "none";
  }

  onScroll() {
    const nearBottom =
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
    if (nearBottom) {
      this.renderNextBatch();
    }
  }

  refresh() {
    this.reset();
  }
}
