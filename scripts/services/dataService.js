// modules/dataService.js - Handles data loading and management
export class DataService {
  constructor() {
    this.assets = [];
    this.filteredAssets = [];
    this.observers = [];
  }

  async loadAssets() {
    try {
      const response = await fetch("./assetData.json");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validate that data is an array
      if (!Array.isArray(data)) {
        console.warn("Asset data is not an array, wrapping in array:", data);
        this.assets = Array.isArray(data) ? data : [data];
      } else {
        this.assets = data;
      }

      this.filteredAssets = [...this.assets];
      this.notifyObservers();

      console.log(`Successfully loaded ${this.assets.length} assets`);
    } catch (error) {
      console.error("Failed to load assets:", error);

      // Fallback to empty array to prevent crashes
      this.assets = [];
      this.filteredAssets = [];
      this.notifyObservers();

      throw error;
    }
  }

  getAssets() {
    return Array.isArray(this.assets) ? this.assets : [];
  }

  getFilteredAssets() {
    return Array.isArray(this.filteredAssets) ? this.filteredAssets : [];
  }

  setFilteredAssets(assets) {
    this.filteredAssets = assets;
    this.notifyObservers();
  }

  // Observer pattern for data changes
  subscribe(callback) {
    this.observers.push(callback);
  }

  unsubscribe(callback) {
    this.observers = this.observers.filter((obs) => obs !== callback);
  }

  notifyObservers() {
    this.observers.forEach((callback) => callback(this.filteredAssets));
  }

  // Featured assets logic
  getFeaturedAssets(count = 6) {
    // Ensure assets is loaded and is an array
    if (!Array.isArray(this.assets) || this.assets.length === 0) {
      console.warn("No assets available for featured selection");
      return [];
    }

    const daysSinceEpoch = this.getDaysSinceEpoch();
    return this.getRandomAssets(this.assets, count, daysSinceEpoch);
  }

  getDaysSinceEpoch() {
    const now = new Date();
    const epoch = new Date("2024-01-01");
    const timeDiff = now.getTime() - epoch.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24));
  }

  seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  getRandomAssets(array, count, seed) {
    // Validate input array
    if (!Array.isArray(array) || array.length === 0) {
      console.warn("getRandomAssets called with invalid array:", array);
      return [];
    }

    // Don't try to get more items than available
    const actualCount = Math.min(count, array.length);

    const shuffled = [...array];

    // Fisher-Yates shuffle with seeded random
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.seededRandom(seed + i) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, actualCount);
  }
}
