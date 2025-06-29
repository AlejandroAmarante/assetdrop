// modules/navigation.js - Handles page navigation and mobile menu
export class NavigationModule {
  constructor() {
    this.currentPage = null;
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const navLinks = document.getElementById("navLinks");

    if (mobileMenuBtn && navLinks) {
      mobileMenuBtn.addEventListener("click", () => {
        navLinks.classList.toggle("mobile-open");
        // Toggle the mobile menu button icon
        mobileMenuBtn.classList.toggle("open");
      });
    }

    // Navigation link events
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const pageId = link.dataset.page;
        this.showPage(pageId);
        // Close mobile menu
        this.closeMobileMenu();
      });
    });

    // Logo click goes to home
    const logoLink = document.querySelector('.logo[data-page="home"]');
    if (logoLink) {
      logoLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.showPage("home");
        this.closeMobileMenu();
      });
    }
  }

  closeMobileMenu() {
    const navLinks = document.getElementById("navLinks");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");

    if (navLinks) {
      navLinks.classList.remove("mobile-open");
    }
    if (mobileMenuBtn) {
      mobileMenuBtn.classList.remove("open");
    }
  }

  showPage(pageId) {
    // Hide all pages
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active");
    });

    // Show target page
    const targetPage = document.getElementById(pageId + "Page");
    if (targetPage) {
      targetPage.classList.add("active");
    }

    // Update navigation active state
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
    });
    const activeLink = document.querySelector(
      `.nav-link[data-page="${pageId}"]`
    );
    if (activeLink) {
      activeLink.classList.add("active");
    }

    this.currentPage = pageId;
  }

  getCurrentPage() {
    return this.currentPage;
  }
}
