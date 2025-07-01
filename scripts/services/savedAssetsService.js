// modules/savedAssetsService.js - Improved with consistent type handling
export class SavedAssetsService {
  constructor() {
    this.storageKey = "assetdrop_saved_assets";
    this.subscribers = [];
    this._cache = null; // Cache for performance
  }

  init() {
    console.log("SavedAssetsService initialized");
    // Preload cache
    this._loadCache();
  }

  _loadCache() {
    try {
      this._cache = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
      return this._cache;
    } catch (error) {
      console.error("Error loading saved assets:", error);
      this._cache = [];
      return [];
    }
  }

  _saveCache() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this._cache));
      this.notifySubscribers();
    } catch (error) {
      console.error("Error saving assets:", error);
    }
  }

  getSavedAssets() {
    if (this._cache === null) {
      this._loadCache();
    }
    return [...this._cache]; // Return copy to prevent external mutation
  }

  saveAsset(asset) {
    if (!asset || !asset.id) {
      console.error("Invalid asset:", asset);
      return false;
    }

    if (this._cache === null) {
      this._loadCache();
    }

    const assetId = String(asset.id); // Ensure consistent string type
    const exists = this._cache.some((saved) => String(saved.id) === assetId);

    if (!exists) {
      // Create a clean copy of the asset with string ID
      const cleanAsset = { ...asset, id: assetId };
      this._cache.push(cleanAsset);
      this._saveCache();
      return true;
    }

    return false;
  }

  removeAsset(assetId) {
    if (this._cache === null) {
      this._loadCache();
    }

    const id = String(assetId); // Ensure consistent string type
    const originalLength = this._cache.length;

    this._cache = this._cache.filter((asset) => String(asset.id) !== id);

    // Only save if something was actually removed
    if (this._cache.length !== originalLength) {
      this._saveCache();
    }
  }

  isAssetSaved(assetId) {
    if (this._cache === null) {
      this._loadCache();
    }

    const id = String(assetId); // Ensure consistent string type
    return this._cache.some((asset) => String(asset.id) === id);
  }

  subscribe(callback) {
    if (typeof callback === "function") {
      this.subscribers.push(callback);
    }
  }

  unsubscribe(callback) {
    this.subscribers = this.subscribers.filter((sub) => sub !== callback);
  }

  notifySubscribers() {
    const savedAssets = this.getSavedAssets();
    this.subscribers.forEach((callback) => {
      try {
        callback(savedAssets);
      } catch (error) {
        console.error("Error in subscriber callback:", error);
      }
    });
  }

  // Clear all saved assets
  clearAll() {
    this._cache = [];
    this._saveCache();
  }

  // Get count of saved assets
  getCount() {
    return this.getSavedAssets().length;
  }
}
