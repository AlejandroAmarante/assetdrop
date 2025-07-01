// main.js - Application entry point and initialization
import { DataService } from "./services/dataService.js";
import { NavigationModule } from "./modules/navigation.js";
import { CarouselModule } from "./modules/carousel.js";
import { AssetGridModule } from "./modules/assetGrid.js";
import { SavedAssetsService } from "./services/savedAssetsService.js";
import { FilterModule } from "./modules/filter.js";
import { ContactModule } from "./modules/contact.js";
import { FAQModule } from "./modules/faq.js";

class App {
  constructor() {
    this.dataService = new DataService();
    this.modules = {};
    this.currentPage = "home"; // Track current page
  }

  async init() {
    try {
      // Load data first
      await this.dataService.loadAssets();
      const assets = this.dataService.getAssets();
      if (assets.length === 0) {
        console.warn("No assets loaded - some features may not work properly");
      }

      // Initialize saved assets
      this.modules.savedAssets = new SavedAssetsService();
      this.modules.savedAssets.init();


      // Initialize core modules
      this.modules.navigation = new NavigationModule();
      this.modules.carousel = new CarouselModule(
        this.dataService,
        this.modules.savedAssets
      );
      this.modules.contact = new ContactModule();
      this.modules.faq = new FAQModule();

      // Create separate asset grid modules for home and saved pages
      this.modules.assetGridHome = new AssetGridModule(
        this.dataService,
        this.modules.savedAssets,
        "home"
      );
      window.assetGridHome = this.modules.assetGridHome; // 💡 expose globally

      this.modules.assetGridSaved = new AssetGridModule(
        this.dataService,
        this.modules.savedAssets,
        "saved"
      );
      window.assetGridSaved = this.modules.assetGridSaved; // 💡 expose globally

      // Create separate filter modules for each page
      this.modules.filterHome = new FilterModule(
        this.dataService,
        this.modules.assetGridHome,
        "home"
      );

      this.modules.filterSaved = new FilterModule(
        this.dataService,
        this.modules.assetGridSaved,
        "saved",
        this.modules.savedAssets // Pass the savedAssetsService here
      );

      // Initialize all modules
      const modulesToInit = [
        this.modules.navigation,
        this.modules.carousel,
        this.modules.assetGridHome,
        this.modules.assetGridSaved,
        this.modules.filterHome,
        this.modules.filterSaved,
        this.modules.contact,
        this.modules.faq,
      ];

      modulesToInit.forEach((module) => {
        if (module && module.init) {
          try {
            module.init();
          } catch (moduleError) {
            console.error(
              `Failed to initialize module:`,
              module.constructor.name,
              moduleError
            );
          }
        }
      });

      // Initialize page switching logic
      this.initPageSwitching();

      document.documentElement.style.scrollBehavior = "smooth";
      console.log("App initialized successfully");
    } catch (error) {
      console.error("Failed to initialize app:", error);
      this.showErrorMessage(
        "Failed to load application data. Please refresh the page or try again later."
      );
    }
  }

  initPageSwitching() {
    // Listen for page navigation
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        const newPage = e.target.closest(".nav-link").dataset.page;
        if (newPage && newPage !== this.currentPage) {
          this.switchPage(newPage);
        }
      });
    });

    // Also listen for logo clicks (goes to home)
    document.querySelectorAll(".logo").forEach((logo) => {
      logo.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.currentPage !== "home") {
          this.switchPage("home");
        }
      });
    });
  }

  switchPage(newPage) {
    // Hide current page
    const currentPageElement = document.getElementById(
      `${this.currentPage}Page`
    );
    if (currentPageElement) {
      currentPageElement.classList.remove("active");
    }

    // Show new page
    const newPageElement = document.getElementById(`${newPage}Page`);
    if (newPageElement) {
      newPageElement.classList.add("active");
    }

    // Update navigation active state
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
      if (link.dataset.page === newPage) {
        link.classList.add("active");
      }
    });

    // Update current page
    this.currentPage = newPage;

    // Reset filters and refresh data for the new page
    if (
      newPage === "home" &&
      this.modules.filterHome &&
      this.modules.assetGridHome
    ) {
      this.modules.filterHome.resetFilters();
      // Ensure the home grid shows all assets
      this.modules.assetGridHome.reset();
    } else if (
      newPage === "saved" &&
      this.modules.filterSaved &&
      this.modules.assetGridSaved
    ) {
      this.modules.filterSaved.resetFilters();
      // Ensure the saved grid shows all saved assets
      this.modules.assetGridSaved.reset();
    }

    // Scroll to top when switching pages
    window.scrollTo(0, 0);
  }

  showErrorMessage(message) {
    let errorDiv = document.getElementById("app-error");
    if (!errorDiv) {
      errorDiv = document.createElement("div");
      errorDiv.id = "app-error";
      errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      `;
      document.body.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 10000);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const app = new App();
  await app.init();
});
