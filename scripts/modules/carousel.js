// modules/carousel.js - Simplified and fixed carousel
export class CarouselModule {
  constructor(dataService, savedAssetsService) {
    this.dataService = dataService;
    this.savedAssetsService = savedAssetsService;
    this.currentSlide = 0;
    this.carouselInterval = null;
    this.progressStartTime = null;
    this.featuredAssets = [];
    this.autoAdvanceDelay = 5000;
    this.userInteractionDelay = 10000;
    this.pausedTime = 0;
    this.isPaused = false;

    // Cache DOM elements
    this.elements = {};
    this.rafId = null;
  }

  init() {
    this.featuredAssets = this.dataService.getFeaturedAssets();
    this.cacheElements();
    this.render();
    this.bindEvents();
    this.startAutoAdvance();
  }

  cacheElements() {
    this.elements = {
      carouselTrack: document.getElementById("carouselTrack"),
      carouselDots: document.getElementById("carouselDots"),
      carouselContainer: document.querySelector(".carousel-container"),
      nextBtn: document.getElementById("carouselNext"),
      prevBtn: document.getElementById("carouselPrev"),
    };
  }

  render() {
    this.renderCarousel();
    this.renderDots();
    this.renderProgressBar();
    this.updateCarousel();
  }

  renderCarousel() {
    if (!this.elements.carouselTrack) return;

    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement("div");

    tempDiv.innerHTML = this.featuredAssets
      .map((asset) => this.createCarouselItem(asset))
      .join("");

    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }

    this.elements.carouselTrack.innerHTML = "";
    this.elements.carouselTrack.appendChild(fragment);

    // Simple event delegation for save buttons
    this.bindSaveButtons();
  }

  bindSaveButtons() {
    if (!this.elements.carouselTrack) return;

    // Remove existing listener
    if (this.saveButtonHandler) {
      this.elements.carouselTrack.removeEventListener(
        "click",
        this.saveButtonHandler
      );
    }

    this.saveButtonHandler = (e) => {
      const saveBtn = e.target.closest(".carousel-save");
      if (saveBtn) {
        e.preventDefault();
        e.stopPropagation();
        this.handleSaveClick(saveBtn);
      }
    };

    this.elements.carouselTrack.addEventListener(
      "click",
      this.saveButtonHandler
    );
  }

  handleSaveClick(saveBtn) {
    const assetId = saveBtn.dataset.assetId;

    // Ensure consistent string comparison
    const assetIdStr = String(assetId);
    const isSaved = this.savedAssetsService.isAssetSaved(assetIdStr);

    if (isSaved) {
      // Remove from saved
      this.savedAssetsService.removeAsset(assetIdStr);
      this.updateSaveButton(saveBtn, false);
    } else {
      // Find and save asset - ensure ID comparison is consistent
      const asset = this.featuredAssets.find(
        (a) => String(a.id) === assetIdStr
      );

      if (asset) {
        this.savedAssetsService.saveAsset(asset);
        this.updateSaveButton(saveBtn, true);
      } else {
        console.error("Asset not found:", assetIdStr);
        return;
      }
    }

    // Sync other grids
    this.syncOtherComponents();
  }

  updateSaveButton(saveBtn, isSaved) {
    const iconEl = saveBtn.querySelector("i");

    if (isSaved) {
      saveBtn.classList.add("saved");
      if (iconEl) iconEl.className = "ri-bookmark-fill";
      saveBtn.title = "Remove from Saved";
    } else {
      saveBtn.classList.remove("saved");
      if (iconEl) iconEl.className = "ri-bookmark-line";
      saveBtn.title = "Save Asset";
    }
  }

  syncOtherComponents() {
    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(() => {
      if (window.assetGridHome?.reset) {
        window.assetGridHome.reset();
      }
      if (window.assetGridSaved?.reset) {
        window.assetGridSaved.reset();
      }
    });
  }

  renderDots() {
    if (!this.elements.carouselDots) return;

    const dotsHTML = this.featuredAssets
      .map(
        (_, index) =>
          `<button class="carousel-dot ${
            index === 0 ? "active" : ""
          }" data-slide="${index}"></button>`
      )
      .join("");

    this.elements.carouselDots.innerHTML = dotsHTML;

    // Event delegation for dots
    if (this.dotClickHandler) {
      this.elements.carouselDots.removeEventListener(
        "click",
        this.dotClickHandler
      );
    }

    this.dotClickHandler = (e) => {
      const dot = e.target.closest(".carousel-dot");
      if (dot) {
        this.handleUserInteraction();
        this.currentSlide = parseInt(dot.dataset.slide);
        this.updateCarousel();
      }
    };

    this.elements.carouselDots.addEventListener("click", this.dotClickHandler);
  }

  renderProgressBar() {
    if (!this.elements.carouselContainer) return;

    const existingProgress =
      this.elements.carouselContainer.querySelector(".carousel-progress");
    if (existingProgress) {
      existingProgress.remove();
    }

    const progressDiv = document.createElement("div");
    progressDiv.className = "carousel-progress";
    progressDiv.innerHTML = `
      <svg class="carousel-progress-svg" width="40" height="40" viewBox="0 0 40 40">
        <circle 
          class="carousel-progress-bg" 
          cx="20" cy="20" r="16" 
          fill="none" 
          stroke="rgba(255, 255, 255, 0.2)" 
          stroke-width="2"
        />
        <circle 
          class="carousel-progress-fill" 
          cx="20" cy="20" r="16" 
          fill="none" 
          stroke="#ffffff" 
          stroke-width="2" 
          stroke-linecap="round"
          stroke-dasharray="100.53" 
          stroke-dashoffset="100.53"
          transform="rotate(-90 20 20)"
        />
      </svg>
      <div class="carousel-progress-icon">
        <i class="ri-pause-fill carousel-progress-pause"></i>
        <i class="ri-play-fill carousel-progress-play"></i>
      </div>
    `;

    this.elements.carouselContainer.appendChild(progressDiv);

    progressDiv.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleAutoAdvance();
    });

    this.elements.progressFill = progressDiv.querySelector(
      ".carousel-progress-fill"
    );
    this.elements.progressBar = progressDiv;
  }

  getSketchfabModelUID(url) {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/[a-f0-9]{32}/i);
    return match ? match[0] : null;
  }

  createCarouselItem(asset) {
    const categoryDisplay = asset.collection
      ? `${asset.category} • ${asset.collection}`
      : asset.category;

    // Ensure consistent string comparison
    const assetIdStr = String(asset.id);
    const isSaved = this.savedAssetsService.isAssetSaved(assetIdStr);
    const icon = isSaved ? "ri-bookmark-fill" : "ri-bookmark-line";
    const btnClass = isSaved ? "carousel-save saved" : "carousel-save";
    const title = isSaved ? "Remove from Saved" : "Save Asset";
    const modelUID = this.getSketchfabModelUID(asset.sketchfabUrl);

    return `
      <div class="carousel-item">
        <iframe 
          class="carousel-embed" 
          src="https://sketchfab.com/models/${modelUID}/embed?autostart=0&ui_theme=dark&ui_controls=1&ui_infos=0&ui_watermark=0"
          frameborder="0" 
          mozallowfullscreen="true" 
          webkitallowfullscreen="true">
        </iframe>
        <div class="carousel-content">
          <div class="carousel-category">${categoryDisplay}</div>
          <h3 class="carousel-title">${asset.title}</h3>
          <p class="carousel-author">by <a href="${asset.authorUrl}" target="_blank">${asset.author}</a></p>
          <p class="carousel-description">${asset.description}</p>
          <div class="carousel-actions">
            <a href="${asset.sketchfabUrl}" target="_blank" class="carousel-link">
              View on Sketchfab
              <i class="ri-share-box-line"></i>
            </a>
            <button class="${btnClass}" title="${title}" data-asset-id="${assetIdStr}">
              <i class="${icon}"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  updateCarousel() {
    if (!this.elements.carouselTrack) return;

    this.elements.carouselTrack.style.transform = `translate3d(-${
      this.currentSlide * 100
    }%, 0, 0)`;

    if (this.elements.carouselDots) {
      const dots = this.elements.carouselDots.children;
      for (let i = 0; i < dots.length; i++) {
        dots[i].classList.toggle("active", i === this.currentSlide);
      }
    }

    this.resetProgressBar();
  }

  updateProgressBar() {
    if (!this.elements.progressFill || !this.progressStartTime) return;

    let elapsed;
    if (this.isPaused) {
      elapsed = this.pausedTime;
    } else {
      elapsed = Date.now() - this.progressStartTime + this.pausedTime;
    }

    const progress = Math.min(elapsed / this.autoAdvanceDelay, 1);
    const circumference = 100.53;
    const offset = circumference * (1 - progress);

    this.elements.progressFill.style.strokeDashoffset = offset;
  }

  resetProgressBar() {
    if (this.elements.progressFill) {
      this.elements.progressFill.style.strokeDashoffset = "100.53";
    }
    this.progressStartTime = Date.now();
    this.pausedTime = 0;
    this.isPaused = false;
  }

  startProgressUpdate() {
    this.stopProgressUpdate();
    if (!this.progressStartTime) {
      this.progressStartTime = Date.now();
    }

    const updateProgress = () => {
      this.updateProgressBar();
      this.rafId = requestAnimationFrame(updateProgress);
    };

    this.rafId = requestAnimationFrame(updateProgress);
  }

  stopProgressUpdate() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.featuredAssets.length;
    this.updateCarousel();
  }

  prevSlide() {
    this.currentSlide =
      (this.currentSlide - 1 + this.featuredAssets.length) %
      this.featuredAssets.length;
    this.updateCarousel();
  }

  startAutoAdvance() {
    this.stopAutoAdvance();

    let delay = this.autoAdvanceDelay;
    if (this.isPaused && this.pausedTime > 0) {
      delay = Math.max(this.autoAdvanceDelay - this.pausedTime, 100);
    }

    this.progressStartTime = Date.now();
    this.isPaused = false;

    this.carouselInterval = setTimeout(() => {
      this.nextSlide();
      this.carouselInterval = setInterval(
        () => this.nextSlide(),
        this.autoAdvanceDelay
      );
    }, delay);

    this.startProgressUpdate();

    if (this.elements.progressBar) {
      this.elements.progressBar.classList.remove("paused");
    }
  }

  stopAutoAdvance() {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
      clearTimeout(this.carouselInterval);
      this.carouselInterval = null;
    }

    if (this.progressStartTime && !this.isPaused) {
      this.pausedTime = Date.now() - this.progressStartTime + this.pausedTime;
      this.isPaused = true;
    }

    this.stopProgressUpdate();
  }

  toggleAutoAdvance() {
    if (this.carouselInterval) {
      this.stopAutoAdvance();
      if (this.elements.progressBar) {
        this.elements.progressBar.classList.add("paused");
      }
    } else {
      this.startAutoAdvance();
      if (this.elements.progressBar) {
        this.elements.progressBar.classList.remove("paused");
      }
    }
  }

  handleUserInteraction() {
    this.stopAutoAdvance();

    if (this.elements.progressBar) {
      this.elements.progressBar.classList.add("paused");
    }

    if (this.userInteractionTimeout) {
      clearTimeout(this.userInteractionTimeout);
    }

    this.userInteractionTimeout = setTimeout(() => {
      this.startAutoAdvance();
    }, this.userInteractionDelay);
  }

  bindEvents() {
    if (this.elements.nextBtn) {
      this.elements.nextBtn.addEventListener("click", () => {
        this.handleUserInteraction();
        this.nextSlide();
      });
    }

    if (this.elements.prevBtn) {
      this.elements.prevBtn.addEventListener("click", () => {
        this.handleUserInteraction();
        this.prevSlide();
      });
    }

    // Simplified container event handling - don't interfere with save buttons
    if (this.elements.carouselContainer) {
      this.containerClickHandler = (e) => {
        // Only trigger user interaction for non-interactive elements
        if (
          !e.target.closest(".carousel-progress") &&
          !e.target.closest(".carousel-save") &&
          !e.target.closest(".carousel-link") &&
          !e.target.closest(".carousel-dot")
        ) {
          this.handleUserInteraction();
        }
      };

      this.elements.carouselContainer.addEventListener(
        "click",
        this.containerClickHandler
      );
    }
  }

  destroy() {
    this.stopAutoAdvance();
    this.stopProgressUpdate();

    if (this.userInteractionTimeout) {
      clearTimeout(this.userInteractionTimeout);
    }

    // Clean up event listeners
    if (this.elements.carouselTrack && this.saveButtonHandler) {
      this.elements.carouselTrack.removeEventListener(
        "click",
        this.saveButtonHandler
      );
    }

    if (this.elements.carouselDots && this.dotClickHandler) {
      this.elements.carouselDots.removeEventListener(
        "click",
        this.dotClickHandler
      );
    }

    if (this.elements.carouselContainer && this.containerClickHandler) {
      this.elements.carouselContainer.removeEventListener(
        "click",
        this.containerClickHandler
      );
    }

    this.elements = {};
  }
}
