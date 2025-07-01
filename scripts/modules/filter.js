// modules/filter.js - Handles asset filtering and search functionality
export class FilterModule {
  constructor(dataService, assetGridModule, pageId, savedAssetsService = null) {
    this.dataService = dataService;
    this.assetGridModule = assetGridModule;
    this.pageId = pageId; // 'home' or 'saved'
    this.savedAssetsService = savedAssetsService; // For saved page filtering
    this.currentCategory = "all";
    this.searchTerm = "";
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Get page-specific elements
    const pageElement = document.getElementById(`${this.pageId}Page`);
    if (!pageElement) return;

    // Category filter buttons - only within this page
    const filterButtons = pageElement.querySelectorAll(".filter-btn");
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.setActiveFilterButton(btn, pageElement);
        this.currentCategory = btn.dataset.category;
        this.applyFilters();
      });
    });

    // Search input - page-specific
    const searchInputId =
      this.pageId === "home" ? "searchInput" : "savedSearchInput";
    const clearBtnId = this.pageId === "home" ? "clearBtn" : "savedClearBtn";

    const searchInput = document.getElementById(searchInputId);
    const clearBtn = document.getElementById(clearBtnId);

    if (searchInput && clearBtn) {
      searchInput.addEventListener("input", (e) => {
        this.searchTerm = e.target.value;
        this.toggleClearButton(clearBtn, this.searchTerm);
        this.applyFilters();
      });

      clearBtn.addEventListener("click", () => {
        this.clearSearch(searchInput, clearBtn);
      });
    }

    const searchBar = pageElement.querySelector(".search-bar");
    if (searchBar && searchInput) {
      searchBar.addEventListener("click", () => {
        searchInput.focus();
      });
    }
  }

  setActiveFilterButton(activeBtn, pageElement) {
    // Remove active class from current active button within this page only
    const currentActive = pageElement.querySelector(".filter-btn.active");
    if (currentActive) {
      currentActive.classList.remove("active");
    }
    // Add active class to clicked button
    activeBtn.classList.add("active");
  }

  toggleClearButton(clearBtn, searchTerm) {
    if (searchTerm.trim() !== "") {
      clearBtn.style.display = "block";
    } else {
      clearBtn.style.display = "none";
    }
  }

  clearSearch(searchInput, clearBtn) {
    searchInput.value = "";
    this.searchTerm = "";
    clearBtn.style.display = "none";
    this.applyFilters();
    searchInput.focus();
  }

  applyFilters() {
    if (this.pageId === "home") {
      // For home page, use the existing logic
      const assets = this.dataService.getAssets();
      const filteredAssets = this.filterAssets(assets);
      this.dataService.setFilteredAssets(filteredAssets);
      this.assetGridModule.reset();
    } else {
      // For saved page, filter saved assets directly
      const savedAssets = this.savedAssetsService.getSavedAssets();
      const filteredAssets = this.filterAssets(savedAssets);
      this.assetGridModule.updateAssets(filteredAssets);
    }
  }

  filterAssets(assets) {
    return assets.filter((asset) => {
      const matchesCategory = this.matchesCategory(asset);
      const matchesSearch = this.matchesSearch(asset);
      return matchesCategory && matchesSearch;
    });
  }

  matchesCategory(asset) {
    return (
      this.currentCategory === "all" || asset.category === this.currentCategory
    );
  }

  matchesSearch(asset) {
    if (!this.searchTerm) return true;
    const searchLower = this.searchTerm.toLowerCase();
    return (
      asset.title.toLowerCase().includes(searchLower) ||
      asset.description.toLowerCase().includes(searchLower) ||
      asset.category.toLowerCase().includes(searchLower)
    );
  }

  // Getters for current filter state
  getCurrentCategory() {
    return this.currentCategory;
  }

  getSearchTerm() {
    return this.searchTerm;
  }

  // Setters for programmatic filter control
  setCategory(category) {
    this.currentCategory = category;
    this.applyFilters();
    // Update UI - only within this page
    const pageElement = document.getElementById(`${this.pageId}Page`);
    if (pageElement) {
      const targetBtn = pageElement.querySelector(
        `[data-category="${category}"]`
      );
      if (targetBtn) {
        this.setActiveFilterButton(targetBtn, pageElement);
      }
    }
  }

  setSearchTerm(term) {
    this.searchTerm = term;
    this.applyFilters();

    // Update UI - page-specific search input and clear button
    const searchInputId =
      this.pageId === "home" ? "searchInput" : "savedSearchInput";
    const clearBtnId = this.pageId === "home" ? "clearBtn" : "savedClearBtn";

    const searchInput = document.getElementById(searchInputId);
    const clearBtn = document.getElementById(clearBtnId);

    if (searchInput) {
      searchInput.value = term;
    }
    if (clearBtn) {
      this.toggleClearButton(clearBtn, term);
    }
  }

  clearFilters() {
    this.setCategory("all");
    this.setSearchTerm("");
  }

  // Reset filters when switching pages
  resetFilters() {
    this.currentCategory = "all";
    this.searchTerm = "";

    // Reset UI elements
    const pageElement = document.getElementById(`${this.pageId}Page`);
    if (pageElement) {
      // Reset filter buttons
      const filterButtons = pageElement.querySelectorAll(".filter-btn");
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      const allBtn = pageElement.querySelector('[data-category="all"]');
      if (allBtn) allBtn.classList.add("active");

      // Reset search input and clear button
      const searchInputId =
        this.pageId === "home" ? "searchInput" : "savedSearchInput";
      const clearBtnId = this.pageId === "home" ? "clearBtn" : "savedClearBtn";

      const searchInput = document.getElementById(searchInputId);
      const clearBtn = document.getElementById(clearBtnId);

      if (searchInput) searchInput.value = "";
      if (clearBtn) clearBtn.style.display = "none";
    }

    // Apply the reset filters to update the asset grid
    this.applyFilters();
  }

  // Method to refresh the current page's data
  refreshPage() {
    // Force a complete refresh of the asset grid with current filters
    this.applyFilters();
  }
}
