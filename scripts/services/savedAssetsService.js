// modules/savedAssetsService.js
export class SavedAssetsService {
  constructor() {
    this.storageKey = "assetdrop_saved_assets";
    this.subscribers = [];
  }

  init() {
    // Initialize the service if needed
    // This method is called by the main app
    console.log("SavedAssetsService initialized");
  }

  getSavedAssets() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
      return saved;
    } catch (error) {
      console.error("Error loading saved assets:", error);
      return [];
    }
  }

  saveAsset(asset) {
    const savedAssets = this.getSavedAssets();
    const exists = savedAssets.find((saved) => saved.id === asset.id);

    if (!exists) {
      savedAssets.push(asset);
      localStorage.setItem(this.storageKey, JSON.stringify(savedAssets));
      this.notifySubscribers();
      return true;
    }
    return false;
  }

  removeAsset(assetId) {
    const savedAssets = this.getSavedAssets();
    const filtered = savedAssets.filter((asset) => asset.id !== assetId);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    this.notifySubscribers();
  }

  isAssetSaved(assetId) {
    const savedAssets = this.getSavedAssets();
    return savedAssets.some((asset) => asset.id === assetId);
  }

  subscribe(callback) {
    this.subscribers.push(callback);
  }

  notifySubscribers() {
    this.subscribers.forEach((callback) => callback(this.getSavedAssets()));
  }
}
