// modules/faq.js - Handles FAQ accordion functionality
export class FAQModule {
  constructor() {
    this.faqItems = [];
  }

  init() {
    this.faqItems = document.querySelectorAll(".faq-item");
    this.bindEvents();
  }

  bindEvents() {
    this.faqItems.forEach((item) => {
      const trigger =
        item.querySelector(".faq-trigger, .faq-header, h3") || item;

      if (trigger) {
        trigger.addEventListener("click", (e) => {
          e.preventDefault();
          this.toggleFaq(item);
        });
      }
    });
  }

  toggleFaq(element) {
    const isActive = element.classList.contains("active");

    // Close all other FAQ items (accordion behavior)
    if (!isActive) {
      this.closeAll();
    }

    // Toggle current item
    element.classList.toggle("active");

    // Handle aria attributes for accessibility
    this.updateAriaAttributes(element);

    // Smooth scroll if needed
    if (element.classList.contains("active")) {
      this.scrollToElement(element);
    }
  }

  closeAll() {
    this.faqItems.forEach((item) => {
      item.classList.remove("active");
      this.updateAriaAttributes(item);
    });
  }

  updateAriaAttributes(element) {
    const trigger =
      element.querySelector('[role="button"], .faq-trigger, .faq-header') ||
      element;
    const content = element.querySelector(".faq-content, .faq-answer");
    const isExpanded = element.classList.contains("active");

    if (trigger) {
      trigger.setAttribute("aria-expanded", isExpanded);
    }

    if (content) {
      content.setAttribute("aria-hidden", !isExpanded);
    }
  }

  scrollToElement(element, offset = 20) {
    const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
    const offsetTop = elementTop - offset;

    window.scrollTo({
      top: offsetTop,
      behavior: "smooth",
    });
  }

  // Open specific FAQ by index
  openFaq(index) {
    if (this.faqItems[index]) {
      this.closeAll();
      this.faqItems[index].classList.add("active");
      this.updateAriaAttributes(this.faqItems[index]);
    }
  }

  // Close specific FAQ by index
  closeFaq(index) {
    if (this.faqItems[index]) {
      this.faqItems[index].classList.remove("active");
      this.updateAriaAttributes(this.faqItems[index]);
    }
  }

  // Get all open FAQs
  getOpenFaqs() {
    return Array.from(this.faqItems).filter((item) =>
      item.classList.contains("active")
    );
  }
}

// Global function for backward compatibility
window.toggleFaq = function (element) {
  element.classList.toggle("active");
};
