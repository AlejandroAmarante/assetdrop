// modules/carousel.js - Handles featured assets carousel with circular progress indicator
export class CarouselModule {
  constructor(dataService, savedAssetsService) {
    this.dataService = dataService;
    this.savedAssetsService = savedAssetsService;
    this.currentSlide = 0;
    this.carouselInterval = null;
    this.userInteractionTimeout = null;
    this.progressInterval = null;
    this.featuredAssets = [];
    this.autoAdvanceDelay = 5000;
    this.userInteractionDelay = 10000;
    this.progressStartTime = null;
    this.progressUpdateInterval = 16; // ~60fps
    this.pausedTime = 0; // Track accumulated paused time
    this.isPaused = false;
  }

  init() {
    this.featuredAssets = this.dataService.getFeaturedAssets();
    this.render();
    this.bindEvents();
    this.startAutoAdvance();
  }

  render() {
    this.renderCarousel();
    this.renderDots();
    this.renderProgressBar();
    this.updateCarousel();
  }

  renderCarousel() {
    const carouselTrack = document.getElementById("carouselTrack");
    if (!carouselTrack) return;

    carouselTrack.innerHTML = this.featuredAssets
      .map((asset) => this.createCarouselItem(asset))
      .join("");

    // Bind save button events after rendering
    this.bindSaveButtons();
  }

  bindSaveButtons() {
    const saveButtons = document.querySelectorAll(".carousel-save");
    saveButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent carousel interaction
        const assetId = btn.dataset.assetId;
        this.handleSaveClick(assetId, btn);
      });
    });
  }

  handleSaveClick(assetId, saveBtn) {
    const isSaved = this.savedAssetsService.isAssetSaved(assetId);

    if (isSaved) {
      this.savedAssetsService.removeAsset(assetId);
      saveBtn.classList.remove("saved");
      saveBtn.querySelector("i").className = "ri-bookmark-line";
      saveBtn.title = "Save Asset";
    } else {
      const asset = this.featuredAssets.find((a) => a.id === assetId);
      if (asset) this.savedAssetsService.saveAsset(asset);
      saveBtn.classList.add("saved");
      saveBtn.querySelector("i").className = "ri-bookmark-fill";
      saveBtn.title = "Remove from Saved";
    }

    // Sync with other grids if they exist
    this.syncOtherGrids();
  }

  syncOtherGrids() {
    // Sync with asset grids if they exist
    if (window.assetGridHome) {
      window.assetGridHome.reset();
    }
    if (window.assetGridSaved) {
      window.assetGridSaved.reset();
    }
  }

  renderDots() {
    const carouselDots = document.getElementById("carouselDots");
    if (!carouselDots) return;

    carouselDots.innerHTML = this.featuredAssets
      .map(
        (_, index) =>
          `<button class="carousel-dot ${
            index === 0 ? "active" : ""
          }" data-slide="${index}"></button>`
      )
      .join("");

    // Bind dot events
    document.querySelectorAll(".carousel-dot").forEach((dot) => {
      dot.addEventListener("click", () => {
        this.handleUserInteraction();
        this.currentSlide = parseInt(dot.dataset.slide);
        this.updateCarousel();
      });
    });
  }

  renderProgressBar() {
    // Find the carousel container to append the progress bar
    const carouselContainer = document.querySelector(".carousel-container");
    if (!carouselContainer) return;

    // Remove existing progress bar if it exists
    const existingProgress =
      carouselContainer.querySelector(".carousel-progress");
    if (existingProgress) {
      existingProgress.remove();
    }

    // Create progress bar HTML
    const progressHTML = `
      <div class="carousel-progress">
        <svg class="carousel-progress-svg" width="40" height="40" viewBox="0 0 40 40">
          <circle 
            class="carousel-progress-bg" 
            cx="20" 
            cy="20" 
            r="16" 
            fill="none" 
            stroke="rgba(255, 255, 255, 0.2)" 
            stroke-width="2"
          />
          <circle 
            class="carousel-progress-fill" 
            cx="20" 
            cy="20" 
            r="16" 
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
      </div>
    `;

    // Insert progress bar into carousel container
    carouselContainer.insertAdjacentHTML("beforeend", progressHTML);

    // Bind progress bar click event
    const progressBar = carouselContainer.querySelector(".carousel-progress");
    if (progressBar) {
      progressBar.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleAutoAdvance();
      });
    }
  }

  createCarouselItem(asset) {
    // Create category display with optional collection
    const categoryDisplay = asset.collection
      ? `${asset.category} • ${asset.collection}`
      : asset.category;

    // Check if asset is saved
    const isSaved = this.savedAssetsService.isAssetSaved(asset.id);
    const icon = isSaved ? "ri-bookmark-fill" : "ri-bookmark-line";
    const btnClass = isSaved ? "carousel-save saved" : "carousel-save";
    const title = isSaved ? "Remove from Saved" : "Save Asset";

    return `
        <div class="carousel-item">
          <iframe 
            class="carousel-embed" 
            src="https://sketchfab.com/models/${asset.sketchfabId}/embed?autostart=0&ui_theme=dark&ui_controls=1&ui_infos=0&ui_watermark=0"
            frameborder="0" 
            allow="autoplay; fullscreen; vr" 
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
              <button class="${btnClass}" title="${title}" data-asset-id="${asset.id}">
                <i class="${icon}"></i>
              </button>
            </div>
          </div>
        </div>
      `;
  }

  updateCarousel() {
    const carouselTrack = document.getElementById("carouselTrack");
    if (!carouselTrack) return;

    // Move carousel
    carouselTrack.style.transform = `translateX(-${this.currentSlide * 100}%)`;

    // Update dots
    document.querySelectorAll(".carousel-dot").forEach((dot, index) => {
      dot.classList.toggle("active", index === this.currentSlide);
    });

    // Reset progress bar
    this.resetProgressBar();

    // Re-bind save buttons after carousel update
    this.bindSaveButtons();
  }

  updateProgressBar() {
    const progressFill = document.querySelector(".carousel-progress-fill");
    if (!progressFill || !this.progressStartTime) return;

    let elapsed;
    if (this.isPaused) {
      // If paused, use the elapsed time at the moment we paused
      elapsed = this.pausedTime;
    } else {
      // If running, calculate current elapsed time
      const currentTime = Date.now();
      elapsed = currentTime - this.progressStartTime + this.pausedTime;
    }

    const progress = Math.min(elapsed / this.autoAdvanceDelay, 1);
    const circumference = 100.53; // 2 * π * r (where r = 16)
    const offset = circumference * (1 - progress);

    progressFill.style.strokeDashoffset = offset;
  }

  resetProgressBar() {
    const progressFill = document.querySelector(".carousel-progress-fill");
    if (progressFill) {
      progressFill.style.strokeDashoffset = "100.53";
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
    this.progressInterval = setInterval(() => {
      this.updateProgressBar();
    }, this.progressUpdateInterval);
  }

  stopProgressUpdate() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
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

    // Calculate remaining time if we're resuming
    let delay = this.autoAdvanceDelay;
    if (this.isPaused && this.pausedTime > 0) {
      delay = Math.max(this.autoAdvanceDelay - this.pausedTime, 100);
    }

    // Reset timeline for new cycle
    this.progressStartTime = Date.now();
    this.isPaused = false;

    this.carouselInterval = setTimeout(() => {
      this.nextSlide();
      // After first advance, use normal interval
      this.carouselInterval = setInterval(
        () => this.nextSlide(),
        this.autoAdvanceDelay
      );
    }, delay);

    this.startProgressUpdate();

    // Update progress bar state
    const progressBar = document.querySelector(".carousel-progress");
    if (progressBar) {
      progressBar.classList.remove("paused");
    }
  }

  stopAutoAdvance() {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
      clearTimeout(this.carouselInterval);
      this.carouselInterval = null;
    }

    // Capture the current elapsed time before stopping
    if (this.progressStartTime && !this.isPaused) {
      const currentTime = Date.now();
      this.pausedTime = currentTime - this.progressStartTime + this.pausedTime;
      this.isPaused = true;
    }

    this.stopProgressUpdate();
  }

  toggleAutoAdvance() {
    const progressBar = document.querySelector(".carousel-progress");

    if (this.carouselInterval) {
      // Currently running, so pause
      this.stopAutoAdvance();
      if (progressBar) {
        progressBar.classList.add("paused");
      }
    } else {
      // Currently paused, so resume
      this.startAutoAdvance();
      if (progressBar) {
        progressBar.classList.remove("paused");
      }
    }
  }

  handleUserInteraction() {
    // Stop auto-advance
    this.stopAutoAdvance();

    // Show paused state
    const progressBar = document.querySelector(".carousel-progress");
    if (progressBar) {
      progressBar.classList.add("paused");
    }

    // Clear existing timeout
    if (this.userInteractionTimeout) {
      clearTimeout(this.userInteractionTimeout);
    }

    // Restart auto-advance after delay
    this.userInteractionTimeout = setTimeout(() => {
      this.startAutoAdvance();
    }, this.userInteractionDelay);
  }

  bindEvents() {
    const nextBtn = document.getElementById("carouselNext");
    const prevBtn = document.getElementById("carouselPrev");
    const carouselContainer = document.querySelector(".carousel-container");

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        this.handleUserInteraction();
        this.nextSlide();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        this.handleUserInteraction();
        this.prevSlide();
      });
    }

    // Handle any interaction within the carousel container
    if (carouselContainer) {
      carouselContainer.addEventListener("click", (e) => {
        // Don't trigger on progress bar clicks or save button clicks
        if (
          !e.target.closest(".carousel-progress") &&
          !e.target.closest(".carousel-save")
        ) {
          this.handleUserInteraction();
        }
      });

      carouselContainer.addEventListener("touchstart", (e) => {
        if (
          !e.target.closest(".carousel-progress") &&
          !e.target.closest(".carousel-save")
        ) {
          this.handleUserInteraction();
        }
      });

      carouselContainer.addEventListener("mousedown", (e) => {
        if (
          !e.target.closest(".carousel-progress") &&
          !e.target.closest(".carousel-save")
        ) {
          this.handleUserInteraction();
        }
      });
    }
  }

  // Method to refresh carousel save states (can be called when saved assets change)
  refreshSaveStates() {
    const saveButtons = document.querySelectorAll(".carousel-save");
    saveButtons.forEach((btn) => {
      const assetId = btn.dataset.assetId;
      const isSaved = this.savedAssetsService.isAssetSaved(assetId);

      if (isSaved) {
        btn.classList.add("saved");
        btn.querySelector("i").className = "ri-bookmark-fill";
        btn.title = "Remove from Saved";
      } else {
        btn.classList.remove("saved");
        btn.querySelector("i").className = "ri-bookmark-line";
        btn.title = "Save Asset";
      }
    });
  }

  destroy() {
    this.stopAutoAdvance();
    this.stopProgressUpdate();
    if (this.userInteractionTimeout) {
      clearTimeout(this.userInteractionTimeout);
    }
  }
}
